// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import "../contracts/HookdGuardMVP.sol";

/**
 * @title CheckCorrectPoolScript
 * @notice Check the state of the correct pool ID
 */
contract CheckCorrectPoolScript is Script {
    address constant HOOK_ADDRESS = 0xdE28c71C1275E8e4A0BF14025e9746cFA0fCd0C0;
    // The correct pool ID from USDC/WETH pair
    bytes32 constant POOL_ID = 0xc25d974b06394a6a01f8860ceb197ba58f74e9625749ec612ce72751ef272758;
    
    function run() external view {
        console.log("=== Checking Correct Pool ===");
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
        console.log("");
        
        if (protectionEnabled) {
            console.log("SUCCESS: Pool is properly configured!");
            console.log("Ready to simulate attacks.");
        } else {
            console.log("WARNING: Pool protection not enabled.");
            console.log("The pool may not have been initialized through the PoolManager.");
        }
        console.log("");
    }
}
