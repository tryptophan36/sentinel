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
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/**
 * @title SimulateAttackScript
 * @notice Simulates various MEV attacks to test HookdGuard protection
 * @dev Run with different attack types to test different protection layers
 */
contract SimulateAttackScript is Script {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // Sepolia addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POOL_SWAP_TEST = 0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe;
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
    // Attack types
    enum AttackType {
        SANDWICH,      // Front-run + back-run
        VELOCITY,      // High volume in short time
        WASH_TRADING,  // Rapid back-and-forth swaps
        GRADUAL        // Progressive fee testing
    }
    
    function run() external {
        uint256 attackerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address hookAddress = vm.envAddress("NEXT_PUBLIC_HOOK_ADDRESS");
        address attacker = vm.addr(attackerPrivateKey);
        
        require(hookAddress != address(0), "Hook address not set");
        
        // Get attack type from environment or default to SANDWICH
        uint256 attackTypeInt = vm.envOr("ATTACK_TYPE", uint256(0));
        AttackType attackType = AttackType(attackTypeInt);
        
        console.log("=== Attack Simulation ===");
        console.log("Attacker:", attacker);
        console.log("Attack Type:", uint256(attackType));
        console.log("");
        
        // Ensure tokens are in correct order
        address token0 = WETH < USDC ? WETH : USDC;
        address token1 = WETH < USDC ? USDC : WETH;
        
        // Create pool key
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 120,
            hooks: IHooks(hookAddress)
        });
        
        if (attackType == AttackType.SANDWICH) {
            simulateSandwich(poolKey, attackerPrivateKey, attacker);
        } else if (attackType == AttackType.VELOCITY) {
            simulateVelocityAttack(poolKey, attackerPrivateKey, attacker);
        } else if (attackType == AttackType.WASH_TRADING) {
            simulateWashTrading(poolKey, attackerPrivateKey, attacker);
        } else if (attackType == AttackType.GRADUAL) {
            simulateGradualAttack(poolKey, attackerPrivateKey, attacker);
        }
    }
    
    /// @notice Simulate sandwich attack (front-run + victim + back-run)
    function simulateSandwich(
        PoolKey memory poolKey,
        uint256 privateKey,
        address attacker
    ) internal {
        console.log("=== SANDWICH ATTACK ===");
        console.log("Testing velocity protection layer");
        console.log("");
        
        vm.startBroadcast(privateKey);
        
        // Approve tokens to PoolSwapTest
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        
        console.log("Step 1: Front-run with large buy (0.5 ETH)");
        executeSwap(poolKey, true, 0.5 ether);
        
        console.log("Step 2: Wait for victim transaction...");
        console.log("(In real scenario, victim swaps here)");
        vm.roll(block.number + 1);
        
        console.log("Step 3: Back-run with large sell (0.5 ETH)");
        executeSwap(poolKey, false, 0.5 ether);
        
        console.log("");
        console.log("Sandwich attack simulation complete");
        console.log("Check if protection triggered with higher fees");
        
        vm.stopBroadcast();
    }
    
    /// @notice Simulate velocity attack (high volume in short time)
    function simulateVelocityAttack(
        PoolKey memory poolKey,
        uint256 privateKey,
        address attacker
    ) internal {
        console.log("=== VELOCITY ATTACK ===");
        console.log("Testing velocity limit protection");
        console.log("");
        
        vm.startBroadcast(privateKey);
        
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        
        console.log("Executing 5 large swaps in same block window...");
        
        for (uint256 i = 0; i < 5; i++) {
            console.log("Swap", i + 1, "of 5");
            executeSwap(poolKey, i % 2 == 0, 0.2 ether);
            
            // Stay within block window (10 blocks)
            if (i < 4) {
                vm.roll(block.number + 2);
            }
        }
        
        console.log("");
        console.log("Velocity attack simulation complete");
        console.log("Protection should trigger surge fees on later swaps");
        
        vm.stopBroadcast();
    }
    
    /// @notice Simulate wash trading (rapid back-and-forth)
    function simulateWashTrading(
        PoolKey memory poolKey,
        uint256 privateKey,
        address attacker
    ) internal {
        console.log("=== WASH TRADING ATTACK ===");
        console.log("Testing progressive fee layer");
        console.log("");
        
        vm.startBroadcast(privateKey);
        
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        
        console.log("Executing 10 rapid swaps back and forth...");
        
        for (uint256 i = 0; i < 10; i++) {
            console.log("Swap", i + 1, "of 10 -", i % 2 == 0 ? "Buy" : "Sell");
            executeSwap(poolKey, i % 2 == 0, 0.05 ether);
            
            // Stay within swap window (50 blocks)
            vm.roll(block.number + 3);
        }
        
        console.log("");
        console.log("Wash trading simulation complete");
        console.log("Progressive fees should increase with each swap");
        
        vm.stopBroadcast();
    }
    
    /// @notice Simulate gradual attack to test progressive fees
    function simulateGradualAttack(
        PoolKey memory poolKey,
        uint256 privateKey,
        address attacker
    ) internal {
        console.log("=== GRADUAL ATTACK ===");
        console.log("Testing progressive fee accumulation");
        console.log("");
        
        vm.startBroadcast(privateKey);
        
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        
        console.log("Executing 5 swaps with increasing frequency...");
        
        for (uint256 i = 0; i < 5; i++) {
            console.log("Swap", i + 1, "of 5");
            executeSwap(poolKey, true, 0.1 ether);
            
            // Decrease time between swaps
            if (i < 4) {
                vm.roll(block.number + (5 - i));
            }
        }
        
        console.log("");
        console.log("Gradual attack simulation complete");
        console.log("Later swaps should have higher progressive fees");
        
        vm.stopBroadcast();
    }
    
    /// @notice Execute a swap on the pool
    function executeSwap(
        PoolKey memory poolKey,
        bool zeroForOne,
        uint256 amount
    ) internal {
        PoolSwapTest swapTest = PoolSwapTest(POOL_SWAP_TEST);
        
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: int256(amount),
            sqrtPriceLimitX96: zeroForOne 
                ? 4295128740  // Min sqrt price
                : 1461446703485210103287273052203988822378723970341 // Max sqrt price
        });
        
        PoolSwapTest.TestSettings memory testSettings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        swapTest.swap(poolKey, params, testSettings, "");
    }
}
