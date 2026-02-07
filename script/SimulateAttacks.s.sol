// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import "../contracts/HookdGuardMVP.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/**
 * @title SimulateAttacks
 * @notice Comprehensive attack simulation that works with current pool state.
 *         Uses exact-input swaps with safe amounts to demonstrate all protection layers.
 *
 *  PHASE env var controls which attack to run:
 *    0 = Normal swaps  (baseline — no protection should trigger)
 *    1 = Wash trading   (rapid back-and-forth → progressive fees)
 *    2 = Volume spike   (large WETH swaps → velocity protection)
 *    3 = Sandwich       (front-run + back-run pattern)
 *    4 = Keeper registration
 *    5 = Challenge flow (submit + vote + execute)
 */
contract SimulateAttacks is Script {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // ── Sepolia addresses ──────────────────────────────────────────
    address constant POOL_MANAGER   = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POOL_SWAP_TEST = 0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe;
    address constant HOOK_ADDRESS   = 0xdE28c71C1275E8e4A0BF14025e9746cFA0fCd0C0;
    address constant USDC           = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant WETH           = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    function run() external {
        uint256 pk   = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address user = vm.addr(pk);
        uint256 phase = vm.envOr("PHASE", uint256(0));

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee:         LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 120,
            hooks:       IHooks(HOOK_ADDRESS)
        });

        PoolId poolId = poolKey.toId();
        HookdGuardMVP hook = HookdGuardMVP(HOOK_ADDRESS);

        console.log("========================================");
        console.log("  Hook'd Guard - Attack Simulation");
        console.log("========================================");
        console.log("User  :", user);
        console.log("Phase :", phase);
        console.log("");

        _logPoolState(hook, poolId, "INITIAL");

        if (phase == 0) _phaseNormalSwaps(poolKey, pk, user);
        else if (phase == 1) _phaseWashTrading(poolKey, pk, user);
        else if (phase == 2) _phaseVolumeSpike(poolKey, pk, user);
        else if (phase == 3) _phaseSandwich(poolKey, pk, user);
        else if (phase == 4) _phaseKeeperRegister(hook, pk, user);
        else if (phase == 5) _phaseChallengeFlow(hook, poolId, pk, user);
        else console.log("Unknown phase. Use PHASE=0..5");

        _logPoolState(hook, poolId, "FINAL");
    }

    // ════════════════════════════════════════════════════════════════
    //  PHASE 0 — Normal swaps (should NOT trigger protection)
    // ════════════════════════════════════════════════════════════════
    function _phaseNormalSwaps(
        PoolKey memory key,
        uint256 pk,
        address user
    ) internal {
        console.log("--- PHASE 0: Normal Swaps (baseline) ---");
        console.log("Executing 3 small USDC -> WETH swaps");
        console.log("Expected: All succeed with base fee only");
        console.log("");

        vm.startBroadcast(pk);
        _approveTokens();

        for (uint256 i = 0; i < 3; i++) {
            console.log("  Swap", i + 1, "of 3 : 10 USDC -> WETH");
            _swapExactInput(key, true, 10e6); // 10 USDC
        }

        vm.stopBroadcast();
    }

    // ════════════════════════════════════════════════════════════════
    //  PHASE 1 — Wash Trading (triggers progressive fees)
    // ════════════════════════════════════════════════════════════════
    function _phaseWashTrading(
        PoolKey memory key,
        uint256 pk,
        address user
    ) internal {
        console.log("--- PHASE 1: Wash Trading Attack ---");
        console.log("Rapid back-and-forth swaps from the same address");
        console.log("Expected: Progressive fees escalate with each swap");
        console.log("  - Each extra swap adds +20% to base fee");
        console.log("  - After 5 swaps: base fee doubles");
        console.log("  - ProtectionTriggered events emitted");
        console.log("");

        vm.startBroadcast(pk);
        _approveTokens();

        // Alternate between USDC->WETH and WETH->USDC
        // Keep amounts small so they don't hit velocity limits
        for (uint256 i = 0; i < 8; i++) {
            bool direction = (i % 2 == 0); // alternate
            string memory dir = direction ? "USDC->WETH" : "WETH->USDC";
            console.log("  Swap", i + 1, "of 8 :", dir);

            if (direction) {
                _swapExactInput(key, true, 15e6);  // 15 USDC exact input
            } else {
                _swapExactInput(key, false, 0.005 ether); // 0.005 WETH exact input
            }
        }

        vm.stopBroadcast();
        console.log("");
        console.log("  >> Progressive fees should have increased on later swaps!");
    }

    // ════════════════════════════════════════════════════════════════
    //  PHASE 2 — Volume Spike (triggers velocity protection)
    // ════════════════════════════════════════════════════════════════
    function _phaseVolumeSpike(
        PoolKey memory key,
        uint256 pk,
        address user
    ) internal {
        console.log("--- PHASE 2: Volume Spike Attack ---");
        console.log("Large WETH swaps to exceed velocity limit (3x baseline)");
        console.log("Expected: First swaps OK, later swaps hit surge fees");
        console.log("");

        vm.startBroadcast(pk);
        _approveTokens();

        // Use WETH exact-input swaps — these produce volume in 18-decimal
        // units, matching the baseline (~0.857 ETH). We need > 2.57 ETH
        // total to exceed 3x.
        uint256[5] memory amounts = [
            uint256(0.05 ether),
            uint256(0.05 ether),
            uint256(0.05 ether),
            uint256(0.05 ether),
            uint256(0.05 ether)
        ];

        for (uint256 i = 0; i < 5; i++) {
            console.log("  Swap", i + 1, "of 5 : 0.05 WETH -> USDC");
            _swapExactInput(key, false, amounts[i]);
        }

        vm.stopBroadcast();
        console.log("");
        console.log("  >> Velocity protection should trigger on later swaps!");
    }

    // ════════════════════════════════════════════════════════════════
    //  PHASE 3 — Sandwich Attack (front-run + back-run)
    // ════════════════════════════════════════════════════════════════
    function _phaseSandwich(
        PoolKey memory key,
        uint256 pk,
        address user
    ) internal {
        console.log("--- PHASE 3: Sandwich Attack ---");
        console.log("Front-run a victim with a large buy, then back-run");
        console.log("Expected: Second swap triggers progressive + velocity fees");
        console.log("");

        vm.startBroadcast(pk);
        _approveTokens();

        // Step 1: Front-run — buy WETH with USDC
        console.log("  Step 1: FRONT-RUN - 50 USDC -> WETH");
        _swapExactInput(key, true, 50e6);

        // Step 2: (victim swap would happen here on-chain)
        console.log("  Step 2: [Victim swap in mempool]");

        // Step 3: Back-run — sell WETH for USDC
        console.log("  Step 3: BACK-RUN - 0.02 WETH -> USDC");
        _swapExactInput(key, false, 0.02 ether);

        // Step 4: Another rapid swap
        console.log("  Step 4: EXTRACT - 30 USDC -> WETH");
        _swapExactInput(key, true, 30e6);

        vm.stopBroadcast();
        console.log("");
        console.log("  >> Protection should trigger on steps 3 & 4!");
    }

    // ════════════════════════════════════════════════════════════════
    //  PHASE 4 — Register as Keeper
    // ════════════════════════════════════════════════════════════════
    function _phaseKeeperRegister(
        HookdGuardMVP hook,
        uint256 pk,
        address user
    ) internal {
        console.log("--- PHASE 4: Keeper Registration ---");
        console.log("");

        HookdGuardMVP.Keeper memory k = hook.getKeeper(user);

        if (k.isActive) {
            console.log("  Already registered as keeper!");
            console.log("  Stake         :", k.stake);
            console.log("  Reputation    :", k.reputationScore);
            return;
        }

        console.log("  Registering as keeper with 0.001 ETH stake...");
        vm.startBroadcast(pk);
        hook.registerKeeper{value: 0.001 ether}();
        vm.stopBroadcast();

        k = hook.getKeeper(user);
        console.log("  Registration successful!");
        console.log("  Stake         :", k.stake);
        console.log("  Reputation    :", k.reputationScore);
        console.log("  Active        :", k.isActive);
        console.log("");
        console.log("  >> Check the Keeper page in the UI!");
    }

    // ════════════════════════════════════════════════════════════════
    //  PHASE 5 — Challenge Flow (submit → vote → execute)
    // ════════════════════════════════════════════════════════════════
    function _phaseChallengeFlow(
        HookdGuardMVP hook,
        PoolId poolId,
        uint256 pk,
        address user
    ) internal {
        console.log("--- PHASE 5: Challenge Flow ---");
        console.log("");

        // Must be a keeper
        HookdGuardMVP.Keeper memory k = hook.getKeeper(user);
        if (!k.isActive) {
            console.log("  ERROR: Not a keeper. Run PHASE=4 first.");
            return;
        }

        // Suspect = PoolSwapTest (the "attacker" that did the swaps)
        address suspect = POOL_SWAP_TEST;
        bytes32 evidence = keccak256("wash-trading-evidence-2024");

        uint256 countBefore = hook.getChallengeCount(poolId);
        console.log("  Challenges before:", countBefore);

        vm.startBroadcast(pk);

        // Submit challenge
        console.log("  Submitting challenge against", suspect);
        uint256 challengeId = hook.submitChallenge(poolId, suspect, evidence);
        console.log("  Challenge ID:", challengeId);

        // Vote for the challenge
        console.log("  Voting FOR the challenge...");
        hook.voteOnChallenge(poolId, challengeId, true);

        vm.stopBroadcast();

        uint256 countAfter = hook.getChallengeCount(poolId);
        console.log("  Challenges after:", countAfter);
        console.log("");
        console.log("  >> Check the Challenges page in the UI!");
        console.log("  >> Wait 5 blocks then run PHASE=6 to execute");
    }

    // ════════════════════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════════════════════

    function _approveTokens() internal {
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
    }

    function _swapExactInput(
        PoolKey memory key,
        bool zeroForOne,
        uint256 amount
    ) internal {
        PoolSwapTest swapTest = PoolSwapTest(POOL_SWAP_TEST);

        // Negative amountSpecified = exact input
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amount),
            sqrtPriceLimitX96: zeroForOne
                ? 4295128740
                : 1461446703485210103287273052203988822378723970341
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        try swapTest.swap(key, params, settings, "") {
            console.log("    -> OK");
        } catch Error(string memory reason) {
            console.log("    -> BLOCKED:", reason);
        } catch {
            console.log("    -> BLOCKED (protection triggered)");
        }
    }

    function _logPoolState(
        HookdGuardMVP hook,
        PoolId poolId,
        string memory label
    ) internal view {
        HookdGuardMVP.PoolState memory s = hook.getPoolState(poolId);
        (uint16 vm_, uint16 bw, uint16 sfm, bool pe) = hook.poolConfigs(poolId);
        console.log("");
        console.log("  [", label, "] Pool State");
        console.log("  Recent Volume  :", s.recentVolume);
        console.log("  Baseline Volume:", s.baselineVolume);
        console.log("  Last Update Blk:", s.lastUpdateBlock);
        console.log("  Protection     :", pe);
        console.log("  Velocity Limit :", uint256(s.baselineVolume) * vm_ / 100);
        console.log("");
    }
}
