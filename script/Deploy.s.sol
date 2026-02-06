// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/HookdGuardMVP.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";

contract DeployScript is Script {
    // Uniswap V4 PoolManager addresses
    // Sepolia: Update with actual V4 testnet address when available
    address constant SEPOLIA_POOL_MANAGER = address(0); // TODO: Update this
    address constant MAINNET_POOL_MANAGER = address(0); // TODO: Update this
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Get the correct pool manager for the chain
        address poolManager = getPoolManager();
        require(poolManager != address(0), "Invalid pool manager address");
        
        // Calculate the hook address prefix needed for permissions
        // This is required by Uniswap V4 hook system
        uint160 flags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG
        );
        
        console.log("Deploying HookdGuard with hook flags:", flags);
        console.log("Pool Manager:", poolManager);
        
        // Deploy the hook
        HookdGuardMVP hook = new HookdGuardMVP{salt: 0}(
            IPoolManager(poolManager)
        );
        
        console.log("HookdGuard deployed to:", address(hook));
        console.log("");
        console.log("Add this to your .env.local:");
        console.log("NEXT_PUBLIC_HOOK_ADDRESS=", address(hook));
        console.log("NEXT_PUBLIC_POOL_MANAGER_ADDRESS=", poolManager);
        
        vm.stopBroadcast();
    }
    
    function getPoolManager() internal view returns (address) {
        uint256 chainId = block.chainid;
        
        if (chainId == 11155111) { // Sepolia
            return SEPOLIA_POOL_MANAGER;
        } else if (chainId == 1) { // Mainnet
            return MAINNET_POOL_MANAGER;
        }
        
        revert("Unsupported chain");
    }
}
