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
 * @title SimulateAttackWorkingScript
 * @notice Working attack simulation with correct addresses
 */
contract SimulateAttackWorkingScript is Script {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // Sepolia addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POOL_SWAP_TEST = 0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe;
    address constant HOOK_ADDRESS = 0xdE28c71C1275E8e4A0BF14025e9746cFA0fCd0C0;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    bytes32 constant POOL_ID = 0xc25d974b06394a6a01f8860ceb197ba58f74e9625749ec612ce72751ef272758;
    
    // Attack types
    enum AttackType {
        SANDWICH,      // Front-run + back-run
        VELOCITY,      // High volume in short time
        WASH_TRADING,  // Rapid back-and-forth swaps
        GRADUAL        // Progressive fee testing
    }
    
    function run() external {
        uint256 attackerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address attacker = vm.addr(attackerPrivateKey);
        
        // Get attack type from environment or default to VELOCITY
        uint256 attackTypeInt = vm.envOr("ATTACK_TYPE", uint256(1));
        AttackType attackType = AttackType(attackTypeInt);
        
        console.log("=== Attack Simulation ===");
        console.log("Attacker:", attacker);
        console.log("Hook:", HOOK_ADDRESS);
        console.log("Pool ID:", vm.toString(POOL_ID));
        console.log("Attack Type:", uint256(attackType));
        console.log("");
        
        // Check initial pool state
        HookdGuardMVP hook = HookdGuardMVP(HOOK_ADDRESS);
        PoolId poolId = PoolId.wrap(POOL_ID);
        HookdGuardMVP.PoolState memory initialState = hook.getPoolState(poolId);
        
        console.log("=== Initial Pool State ===");
        console.log("Recent Volume:", initialState.recentVolume);
        console.log("Baseline Volume:", initialState.baselineVolume);
        console.log("Last Update Block:", initialState.lastUpdateBlock);
        console.log("");
        
        // Create pool key
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 120,
            hooks: IHooks(HOOK_ADDRESS)
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
        
        // Check final pool state
        HookdGuardMVP.PoolState memory finalState = hook.getPoolState(poolId);
        
        console.log("");
        console.log("=== Final Pool State ===");
        console.log("Recent Volume:", finalState.recentVolume);
        console.log("Baseline Volume:", finalState.baselineVolume);
        console.log("Last Update Block:", finalState.lastUpdateBlock);
        console.log("");
        console.log("Volume Change:", finalState.recentVolume - initialState.recentVolume);
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
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        
        console.log("Step 1: Front-run with large buy (0.01 ETH)");
        executeSwap(poolKey, false, 0.01 ether); // Buy USDC with WETH
        
        console.log("Step 2: Wait for victim transaction...");
        console.log("(In real scenario, victim swaps here)");
        vm.roll(block.number + 1);
        
        console.log("Step 3: Back-run with large sell (0.01 ETH)");
        executeSwap(poolKey, true, 0.01 ether); // Sell USDC for WETH
        
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
        console.log("Baseline: 1 ETH, Max allowed: 3 ETH (3x)");
        console.log("");
        
        vm.startBroadcast(privateKey);
        
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        
        console.log("Executing 5 swaps to exceed velocity limit...");
        
        for (uint256 i = 0; i < 5; i++) {
            console.log("Swap", i + 1, "of 5 - Amount: 0.8 ETH");
            executeSwap(poolKey, i % 2 == 0, 0.8 ether);
            
            // Stay within block window (10 blocks)
            if (i < 4) {
                vm.roll(block.number + 2);
            }
        }
        
        console.log("");
        console.log("Total volume: ~4 ETH (exceeds 3 ETH limit)");
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
        
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        
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
        
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        
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
        
        try swapTest.swap(poolKey, params, testSettings, "") {
            console.log("  Swap executed successfully");
        } catch Error(string memory reason) {
            console.log("  Swap failed:", reason);
        } catch {
            console.log("  Swap failed (unknown reason)");
        }
    }
}
