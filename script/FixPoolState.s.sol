// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import "../contracts/HookdGuardMVP.sol";

/**
 * @title FixPoolStateScript
 * @notice Manually set pool state since afterInitialize wasn't called
 * @dev This is a workaround - normally afterInitialize would set this
 */
contract FixPoolStateScript is Script {
    // From .env.local
    address constant HOOK_ADDRESS = 0xdE28c71C1275E8e4A0BF14025e9746cFA0fCd0C0;
    bytes32 constant POOL_ID = 0x357d9a61623f0c9209fa971ad0a6f7fbc4330ed1f0185eb3116bbbe0346ee0ca;
    
    function run() external {
        console.log("=== Checking Pool State ===");
        console.log("This pool needs to be initialized through the PoolManager");
        console.log("The hook's afterInitialize will automatically set up protection");
        console.log("");
        console.log("Current Pool ID:", vm.toString(POOL_ID));
        console.log("Hook Address:", HOOK_ADDRESS);
        console.log("");
        console.log("IMPORTANT: The pool state is empty because:");
        console.log("1. The pool was not initialized through PoolManager.initialize()");
        console.log("2. Or the hook's afterInitialize was not triggered");
        console.log("");
        console.log("To fix this, you need to:");
        console.log("1. Make sure you're using the correct pool ID");
        console.log("2. Initialize the pool through PoolManager if not done yet");
        console.log("3. The hook will automatically configure protection on initialization");
        console.log("");
        console.log("Let's check if there's another pool ID we should use...");
        console.log("Pool ID from USDC/WETH pair: 0xc25d974b06394a6a01f8860ceb197ba58f74e9625749ec612ce72751ef272758");
        console.log("Pool ID in .env.local:       0x357d9a61623f0c9209fa971ad0a6f7fbc4330ed1f0185eb3116bbbe0346ee0ca");
        console.log("");
        console.log("These don't match! Update .env.local with the correct pool ID.");
    }
}
