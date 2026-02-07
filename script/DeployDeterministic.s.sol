// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/HookdGuardMVP.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {HookMiner} from "v4-periphery/utils/HookMiner.sol";

/**
 * @title DeployDeterministicScript
 * @notice Deploys HookdGuard with a specific address prefix required by Uniswap V4
 * @dev Uniswap V4 hooks must have addresses with specific bit flags set
 */
contract DeployDeterministicScript is Script {
    // Foundry CREATE2 Deployer address (same across most chains)
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    
    // Required hook permissions encoded in address
    uint160 constant HOOK_FLAGS = uint160(
        Hooks.AFTER_INITIALIZE_FLAG |
        Hooks.BEFORE_SWAP_FLAG |
        Hooks.AFTER_SWAP_FLAG
    );
    
    // Pool manager addresses - update these with actual V4 addresses
    address constant SEPOLIA_POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant MAINNET_POOL_MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address poolManager = getPoolManager();
        require(poolManager != address(0), "Invalid pool manager address");
        
        // Mine for the correct salt using HookMiner
        bytes memory constructorArgs = abi.encode(poolManager);
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            HOOK_FLAGS,
            type(HookdGuardMVP).creationCode,
            constructorArgs
        );
        
        console.log("Found valid hook address:", hookAddress);
        console.log("Using salt:", vm.toString(salt));
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy with the mined salt using CREATE2
        HookdGuardMVP hook = new HookdGuardMVP{salt: salt}(
            IPoolManager(poolManager)
        );
        
        require(address(hook) == hookAddress, "Address mismatch");
        
        console.log("");
        console.log("=== Deployment Successful ===");
        console.log("Hook Address:", address(hook));
        console.log("Pool Manager:", poolManager);
        console.log("");
        console.log("Add to .env.local:");
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
