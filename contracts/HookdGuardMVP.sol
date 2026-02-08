// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/utils/BaseHook.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/// @title HookdGuardMVP
/// @notice Protects LPs from MEV through velocity limits and progressive fees
contract HookdGuardMVP is BaseHook {
    using PoolIdLibrary for PoolKey;

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice Pool velocity and volume tracking
    struct PoolState {
        uint128 recentVolume;        // Volume in last 10 blocks
        uint128 baselineVolume;      // 24hr moving average
        uint64 lastUpdateBlock;      // Last state update
        uint160 lastPrice;           // Last sqrt price
    }
    
    /// @notice Per-address swap history for progressive fees
    struct SwapHistory {
        uint16 swapsInWindow;        // Swaps in last 50 blocks
        uint128 volumeInWindow;      // Volume in last 50 blocks
        uint64 lastSwapBlock;        // Last swap block number
    }
    
    /// @notice Challenge submitted by keepers
    struct Challenge {
        address suspectedAttacker;   // Address under investigation
        address challenger;          // Keeper who submitted
        bytes32 evidenceHash;        // IPFS hash of evidence
        uint64 submitBlock;          // When submitted
        uint16 votesFor;             // Votes approving
        uint16 votesAgainst;         // Votes rejecting
        bool executed;               // Whether penalty applied
        uint128 challengerStake;     // Stake put up by challenger
    }
    
    /// @notice Keeper registration
    struct Keeper {
        uint128 stake;               // ETH staked
        uint64 reputationScore;      // 0-10000 scale
        bool isActive;               // Currently active
    }
    
    /// @notice Pool-specific configuration
    struct PoolConfig {
        uint16 velocityMultiplier;   // Max velocity (e.g., 300 = 3x)
        uint16 blockWindow;          // Blocks to track (e.g., 10)
        uint16 surgeFeeMultiplier;   // Fee increase rate (e.g., 500 = 5x)
        bool protectionEnabled;      // Master switch
    }
    
    // State mappings
    mapping(PoolId => PoolState) public poolStates;
    mapping(PoolId => PoolConfig) public poolConfigs;
    mapping(address => mapping(PoolId => SwapHistory)) public swapHistories;
    mapping(address => Keeper) public keepers;
    mapping(PoolId => Challenge[]) public challenges;
    mapping(PoolId => mapping(address => uint64)) public addressPenalties; // Penalty until block
    
    address[] public activeKeepers;
    
    // Constants
    uint256 public constant MIN_KEEPER_STAKE = 0.001 ether;
    uint256 public constant CHALLENGE_DURATION = 5; // blocks
    uint256 public constant PENALTY_DURATION = 100; // blocks
    uint256 public constant PENALTY_FEE_BPS = 5000; // 50% extra fee
    
    // ============================================
    // EVENTS
    // ============================================
    
    event KeeperRegistered(address indexed keeper, uint128 stake);
    event ChallengeSubmitted(
        PoolId indexed poolId,
        uint256 challengeId,
        address indexed attacker,
        address indexed challenger
    );
    event ChallengeVoted(
        PoolId indexed poolId,
        uint256 challengeId,
        address indexed voter,
        bool support
    );
    event ChallengeExecuted(
        PoolId indexed poolId,
        uint256 challengeId,
        bool approved
    );
    event ProtectionTriggered(
        PoolId indexed poolId,
        address indexed swapper,
        uint24 fee,
        string reason
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}
    
    // ============================================
    // HOOK PERMISSIONS
    // ============================================
    
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }
    
    // ============================================
    // HOOK IMPLEMENTATIONS
    // ============================================
    
    /// @notice Base LP fee for dynamic fee pools (0.3%)
    uint24 public constant BASE_LP_FEE = 3000;
    
    /// @notice Initialize pool configuration
    function _afterInitialize(
        address,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24
    ) internal override returns (bytes4) {
        PoolId poolId = key.toId();
        
        // Set default configuration
        poolConfigs[poolId] = PoolConfig({
            velocityMultiplier: 300,      // 3x baseline
            blockWindow: 10,              // 10 blocks
            surgeFeeMultiplier: 500,      // 5x surge
            protectionEnabled: true
        });
        
        // Initialize state with reasonable baseline for 6-decimal tokens (e.g., USDC)
        // 50 USDC baseline → velocity triggers at 150 USDC in window
        poolStates[poolId] = PoolState({
            recentVolume: 0,
            baselineVolume: 50_000_000,   // 50e6 (50 USDC-equivalent)
            lastUpdateBlock: uint64(block.number),
            lastPrice: sqrtPriceX96
        });
        
        // Set base LP fee for dynamic fee pools
        // (dynamic fee pools initialize with fee=0, we must set the base fee here)
        poolManager.updateDynamicLPFee(key, BASE_LP_FEE);
        
        return BaseHook.afterInitialize.selector;
    }
    
    /// @notice Main protection logic before swap
    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        PoolConfig memory config = poolConfigs[poolId];
        
        // Skip if protection disabled
        if (!config.protectionEnabled) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }
        
        // Use tx.origin for per-user tracking (Layer 2 & 3).
        // `sender` is the router contract (e.g. PoolSwapTest), NOT the actual user.
        // tx.origin gives us the real wallet behind the swap, so progressive fees
        // and penalties are properly per-user instead of shared across all users.
        address swapper = tx.origin;
        
        // Normalize swap amount to token0 (currency0) scale for consistent volume tracking.
        // Raw WETH amounts (18 decimals) are converted to USDC-equivalent (6 decimals)
        // using the pool's sqrtPriceX96, so a 0.05 WETH swap is treated as ~125 USDC,
        // not as 50,000,000,000,000,000 raw units.
        uint128 swapAmount = _getNormalizedAmount(poolId, params);
        
        // Layer 1: Velocity Protection (pool-wide, uses swap amount only)
        uint24 velocityFee = _checkVelocity(poolId, swapAmount, config);
        
        // Layer 2: Progressive Fees (per-user, uses tx.origin)
        uint24 progressiveFee = _checkProgressive(poolId, swapper, swapAmount);
        
        // Layer 3: Challenge Penalty (per-user, uses tx.origin)
        uint24 penaltyFee = _checkPenalty(poolId, swapper);
        
        // Combine fees (take maximum to avoid stacking)
        uint24 totalFee = _maxFee(velocityFee, progressiveFee, penaltyFee);
        
        // Emit if protection triggered
        if (totalFee > 0) {
            emit ProtectionTriggered(poolId, swapper, totalFee, "MEV_PROTECTION");
            
            // Return base fee + surge with OVERRIDE flag so PoolManager actually uses it.
            // Without OVERRIDE_FEE_FLAG, the dynamic fee from the hook is silently ignored.
            uint24 overrideFee = (BASE_LP_FEE + totalFee) | LPFeeLibrary.OVERRIDE_FEE_FLAG;
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, overrideFee);
        }
        
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }
    
    /// @notice Update state after swap
    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        
        // Normalize to token0 scale (same as _beforeSwap) for consistent tracking
        uint128 swapAmount = _getNormalizedAmount(poolId, params);
        
        // Update pool state (pool-wide velocity tracking)
        _updatePoolState(poolId, swapAmount);
        
        // Update swap history for the actual user (tx.origin), not the router
        _updateSwapHistory(poolId, tx.origin, swapAmount);
        
        return (BaseHook.afterSwap.selector, 0);
    }
    
    // ============================================
    // PROTECTION LAYER FUNCTIONS
    // ============================================
    
    /// @notice Layer 1: Check velocity and apply surge pricing
    function _checkVelocity(
        PoolId poolId,
        uint128 swapAmount,
        PoolConfig memory config
    ) internal view returns (uint24) {
        PoolState memory state = poolStates[poolId];
        
        // Guard: if baseline is zero, skip velocity check to avoid division by zero
        if (state.baselineVolume == 0) {
            return 0;
        }
        
        // Reset if window expired
        uint128 currentVolume = state.recentVolume;
        if (block.number > state.lastUpdateBlock + config.blockWindow) {
            currentVolume = 0;
        }
        
        uint128 newVolume = currentVolume + swapAmount;
        uint128 maxAllowed = state.baselineVolume * config.velocityMultiplier / 100;
        
        // Guard: if maxAllowed is zero (e.g., very small baseline * multiplier rounds to 0)
        if (maxAllowed == 0) {
            return 0;
        }
        
        // If under threshold, no surge fee
        if (newVolume <= maxAllowed) {
            return 0;
        }
        
        // Calculate surge fee with overflow protection
        // Cap excessRatio to prevent uint24 overflow in surgeFee calculation
        uint256 excessRatio = (uint256(newVolume - maxAllowed) * 10000) / maxAllowed;
        
        // Cap excessRatio so that surgeFee stays within uint24 range (max 16,777,215)
        // surgeFee = (3000 * surgeFeeMultiplier * excessRatio) / 1_000_000
        // Max safe excessRatio = 100000 * 1_000_000 / (3000 * 500) = 66,666
        // Use a generous cap; the final surgeFee cap at 100000 handles the rest
        uint256 rawSurgeFee = (3000 * uint256(config.surgeFeeMultiplier) * excessRatio) / 1_000_000;
        
        // Cap at 10% (100000 bps) before casting to uint24
        if (rawSurgeFee > 100000) {
            return 100000;
        }
        
        return uint24(rawSurgeFee);
    }
    
    /// @notice Layer 2: Progressive fees based on frequency
    function _checkProgressive(
        PoolId poolId,
        address sender,
        uint128 swapAmount
    ) internal view returns (uint24) {
        SwapHistory memory history = swapHistories[sender][poolId];
        
        // Reset if window expired
        uint16 swapCount = history.swapsInWindow;
        if (block.number > history.lastSwapBlock + 50) {
            swapCount = 0;
        }
        
        // Calculate progressive multiplier
        // Each swap adds 20% to fee
        uint24 multiplier = uint24(100 + (swapCount * 20));
        uint24 baseFee = 3000; // 0.3%
        uint24 adjustedFee = baseFee * multiplier / 100;
        
        return adjustedFee > baseFee ? adjustedFee - baseFee : 0;
    }
    
    /// @notice Layer 3: Penalty for challenged addresses
    function _checkPenalty(
        PoolId poolId,
        address sender
    ) internal view returns (uint24) {
        uint64 penaltyUntil = addressPenalties[poolId][sender];
        
        if (block.number < penaltyUntil) {
            return uint24(PENALTY_FEE_BPS * 10); // 50% = 50000 bps
        }
        
        return 0;
    }
    
    /// @notice Return maximum fee
    function _maxFee(uint24 a, uint24 b, uint24 c) internal pure returns (uint24) {
        uint24 max = a > b ? a : b;
        return max > c ? max : c;
    }
    
    /// @notice Normalize token1 amount to token0 equivalent using pool sqrtPriceX96
    /// @dev price = sqrtPriceX96^2 / 2^192 = (token1 per token0 in raw units)
    ///      token0 = token1 / price = token1 * 2^192 / sqrtPriceX96^2
    ///      Computed in two 96-bit shifts to avoid overflow.
    function _normalizeToToken0(
        uint128 token1Amount,
        uint160 sqrtPriceX96
    ) internal pure returns (uint128) {
        if (sqrtPriceX96 == 0 || token1Amount == 0) return token1Amount;
        
        uint256 intermediate = (uint256(token1Amount) << 96) / uint256(sqrtPriceX96);
        uint256 result = (intermediate << 96) / uint256(sqrtPriceX96);
        
        return result > type(uint128).max ? type(uint128).max : uint128(result);
    }
    
    /// @notice Get normalized swap amount in token0 units for consistent volume tracking
    function _getNormalizedAmount(
        PoolId poolId,
        SwapParams calldata params
    ) internal view returns (uint128) {
        uint128 rawAmount = uint128(
            params.amountSpecified > 0
                ? uint256(params.amountSpecified)
                : uint256(-params.amountSpecified)
        );
        
        // If selling token1 (zeroForOne=false), normalize to token0 scale using pool price
        if (!params.zeroForOne) {
            uint160 lastPrice = poolStates[poolId].lastPrice;
            rawAmount = _normalizeToToken0(rawAmount, lastPrice);
        }
        
        return rawAmount;
    }
    
    // ============================================
    // STATE UPDATE FUNCTIONS
    // ============================================
    
    /// @notice Update pool velocity state
    function _updatePoolState(PoolId poolId, uint128 swapAmount) internal {
        PoolState storage state = poolStates[poolId];
        PoolConfig memory config = poolConfigs[poolId];
        
        // Reset if window expired
        if (block.number > state.lastUpdateBlock + config.blockWindow) {
            state.recentVolume = swapAmount;
        } else {
            state.recentVolume += swapAmount;
        }
        
        state.lastUpdateBlock = uint64(block.number);
        
        // Update baseline (simple moving average)
        // In production, would use proper TWAP
        state.baselineVolume = (state.baselineVolume * 95 + swapAmount * 5) / 100;
    }
    
    /// @notice Update per-address swap history
    function _updateSwapHistory(
        PoolId poolId,
        address sender,
        uint128 swapAmount
    ) internal {
        SwapHistory storage history = swapHistories[sender][poolId];
        
        // Reset if window expired
        if (block.number > history.lastSwapBlock + 50) {
            history.swapsInWindow = 1;
            history.volumeInWindow = swapAmount;
        } else {
            history.swapsInWindow++;
            history.volumeInWindow += swapAmount;
        }
        
        history.lastSwapBlock = uint64(block.number);
    }
    
    // ============================================
    // KEEPER FUNCTIONS
    // ============================================
    
    /// @notice Register as a keeper
    function registerKeeper() external payable {
        require(msg.value >= MIN_KEEPER_STAKE, "Insufficient stake");
        require(!keepers[msg.sender].isActive, "Already registered");
        
        keepers[msg.sender] = Keeper({
            stake: uint128(msg.value),
            reputationScore: 5000, // Start at neutral
            isActive: true
        });
        
        activeKeepers.push(msg.sender);
        
        emit KeeperRegistered(msg.sender, uint128(msg.value));
    }
    
    /// @notice Submit challenge against suspected attacker
    function submitChallenge(
        PoolId poolId,
        address suspectedAttacker,
        bytes32 evidenceHash
    ) external returns (uint256) {
        require(keepers[msg.sender].isActive, "Not a keeper");
        require(keepers[msg.sender].stake >= MIN_KEEPER_STAKE, "Insufficient stake");
        
        uint256 challengeId = challenges[poolId].length;
        
        challenges[poolId].push(Challenge({
            suspectedAttacker: suspectedAttacker,
            challenger: msg.sender,
            evidenceHash: evidenceHash,
            submitBlock: uint64(block.number),
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            challengerStake: uint128(MIN_KEEPER_STAKE / 10) // 10% of min stake
        }));
        
        emit ChallengeSubmitted(poolId, challengeId, suspectedAttacker, msg.sender);
        
        return challengeId;
    }
    
    /// @notice Vote on a challenge
    function voteOnChallenge(
        PoolId poolId,
        uint256 challengeId,
        bool support
    ) external {
        require(keepers[msg.sender].isActive, "Not a keeper");
        
        Challenge storage challenge = challenges[poolId][challengeId];
        require(!challenge.executed, "Already executed");
        require(block.number < challenge.submitBlock + CHALLENGE_DURATION, "Voting ended");
        
        // Weight vote by reputation
        uint16 weight = uint16(keepers[msg.sender].reputationScore / 1000);
        
        if (support) {
            challenge.votesFor += weight;
        } else {
            challenge.votesAgainst += weight;
        }
        
        emit ChallengeVoted(poolId, challengeId, msg.sender, support);
    }
    
    /// @notice Execute challenge after voting period
    function executeChallenge(
        PoolId poolId,
        uint256 challengeId
    ) external {
        Challenge storage challenge = challenges[poolId][challengeId];
        
        require(!challenge.executed, "Already executed");
        require(block.number >= challenge.submitBlock + CHALLENGE_DURATION, "Voting active");
        
        uint16 totalVotes = challenge.votesFor + challenge.votesAgainst;
        require(totalVotes > 0, "No votes");
        
        // Require 70% supermajority
        bool approved = (challenge.votesFor * 100 / totalVotes) >= 70;
        
        if (approved) {
            // Apply penalty
            addressPenalties[poolId][challenge.suspectedAttacker] = 
                uint64(block.number + PENALTY_DURATION);
            
            // Reward challenger
            keepers[challenge.challenger].reputationScore += 100;
            
        } else {
            // Penalize false accuser
            if (keepers[challenge.challenger].reputationScore > 100) {
                keepers[challenge.challenger].reputationScore -= 100;
            }
        }
        
        challenge.executed = true;
        
        emit ChallengeExecuted(poolId, challengeId, approved);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getPoolState(PoolId poolId) external view returns (PoolState memory) {
        return poolStates[poolId];
    }
    
    function getSwapHistory(
        address user,
        PoolId poolId
    ) external view returns (SwapHistory memory) {
        return swapHistories[user][poolId];
    }
    
    function getChallenge(
        PoolId poolId,
        uint256 challengeId
    ) external view returns (Challenge memory) {
        return challenges[poolId][challengeId];
    }
    
    function getChallengeCount(PoolId poolId) external view returns (uint256) {
        return challenges[poolId].length;
    }
    
    function getKeeper(address keeper) external view returns (Keeper memory) {
        return keepers[keeper];
    }
    
    function isPenalized(
        PoolId poolId,
        address user
    ) external view returns (bool) {
        return block.number < addressPenalties[poolId][user];
    }
}
