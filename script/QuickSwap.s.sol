// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import "../contracts/HookdGuardMVP.sol";

/**
 * @title QuickSwapScript
 * @notice Quick script to check pool state and test protection
 */
contract QuickSwapScript is Script {
    using PoolIdLibrary for PoolKey;

    function run() external view {
        address hookAddress = vm.envAddress("NEXT_PUBLIC_HOOK_ADDRESS");
        string memory poolIdStr = vm.envString("NEXT_PUBLIC_POOL_IDS");
        
        require(hookAddress != address(0), "Hook address not set");
        
        console.log("=== Pool Status Check ===");
        console.log("Hook:", hookAddress);
        console.log("");
        
        HookdGuardMVP hook = HookdGuardMVP(hookAddress);
        
        // Parse pool ID from string
        bytes32 poolIdBytes = vm.parseBytes32(poolIdStr);
        PoolId poolId = PoolId.wrap(poolIdBytes);
        
        // Get pool state
        HookdGuardMVP.PoolState memory state = hook.getPoolState(poolId);
        
        // Get pool config (public mapping returns tuple)
        (uint16 velocityMultiplier, uint16 blockWindow, uint16 surgeFeeMultiplier, bool protectionEnabled) = hook.poolConfigs(poolId);
        
        console.log("=== Pool Configuration ===");
        console.log("Protection Enabled:", protectionEnabled);
        console.log("Velocity Multiplier:", velocityMultiplier);
        console.log("Block Window:", blockWindow);
        console.log("Surge Fee Multiplier:", surgeFeeMultiplier);
        console.log("");
        
        console.log("=== Current State ===");
        console.log("Recent Volume:", state.recentVolume);
        console.log("Baseline Volume:", state.baselineVolume);
        console.log("Last Update Block:", state.lastUpdateBlock);
        console.log("Current Block:", block.number);
        console.log("Blocks Since Update:", block.number - state.lastUpdateBlock);
        console.log("");
        
        // Calculate protection thresholds
        uint128 maxAllowedVolume = state.baselineVolume * velocityMultiplier / 100;
        console.log("=== Protection Thresholds ===");
        console.log("Max Allowed Volume:", maxAllowedVolume);
        
        if (maxAllowedVolume > 0 && state.recentVolume > 0) {
            console.log("Current Utilization (%):", state.recentVolume * 100 / maxAllowedVolume);
        }
        console.log("");
        
        if (state.recentVolume > maxAllowedVolume) {
            console.log("WARNING: PROTECTION TRIGGERED - Volume exceeds threshold!");
        } else {
            console.log("Pool operating normally");
        }
        console.log("");
    }
}
