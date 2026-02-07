// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import "../contracts/HookdGuardMVP.sol";

/**
 * @title CheckPoolStateScript
 * @notice Simple script to check pool state without environment variables
 */
contract CheckPoolStateScript is Script {
    // Hardcoded values from .env.local
    address constant HOOK_ADDRESS = 0xdE28c71C1275E8e4A0BF14025e9746cFA0fCd0C0;
    bytes32 constant POOL_ID = 0x357d9a61623f0c9209fa971ad0a6f7fbc4330ed1f0185eb3116bbbe0346ee0ca;
    
    function run() external view {
        console.log("=== Pool Status Check ===");
        console.log("Hook:", HOOK_ADDRESS);
        console.log("Pool ID:", vm.toString(POOL_ID));
        console.log("");
        
        HookdGuardMVP hook = HookdGuardMVP(HOOK_ADDRESS);
        PoolId poolId = PoolId.wrap(POOL_ID);
        
        // Get pool state
        HookdGuardMVP.PoolState memory state = hook.getPoolState(poolId);
        
        // Get pool config
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
