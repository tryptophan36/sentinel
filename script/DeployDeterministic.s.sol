// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/HookdGuardMVP.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";

/**
 * @title DeployDeterministicScript
 * @notice Deploys HookdGuard with a specific address prefix required by Uniswap V4
 * @dev Uniswap V4 hooks must have addresses with specific bit flags set
 */
contract DeployDeterministicScript is Script {
    // Required hook permissions encoded in address
    uint160 constant HOOK_FLAGS = uint160(
        Hooks.AFTER_INITIALIZE_FLAG |
        Hooks.BEFORE_SWAP_FLAG |
        Hooks.AFTER_SWAP_FLAG
    );
    
    // Pool manager addresses - update these with actual V4 addresses
    address constant SEPOLIA_POOL_MANAGER = address(0); // TODO
    address constant MAINNET_POOL_MANAGER = address(0); // TODO
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address poolManager = getPoolManager();
        require(poolManager != address(0), "Invalid pool manager address");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Mine for the correct salt
        (address hookAddress, bytes32 salt) = mineSalt(vm.addr(deployerPrivateKey), poolManager);
        
        console.log("Found valid hook address:", hookAddress);
        console.log("Using salt:", vm.toString(salt));
        
        // Deploy with the mined salt
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
    
    function mineSalt(
        address deployer,
        address poolManager
    ) internal view returns (address, bytes32) {
        bytes memory creationCode = abi.encodePacked(
            type(HookdGuardMVP).creationCode,
            abi.encode(poolManager)
        );
        
        // Try different salts until we find one that produces a valid hook address
        for (uint256 i = 0; i < 100000; i++) {
            bytes32 salt = bytes32(i);
            address predictedAddress = computeCreate2Address(
                salt,
                keccak256(creationCode),
                deployer
            );
            
            // Check if address has correct hook flags
            if (uint160(predictedAddress) & HOOK_FLAGS == HOOK_FLAGS) {
                return (predictedAddress, salt);
            }
        }
        
        revert("Could not find valid salt");
    }
    
    function computeCreate2Address(
        bytes32 salt,
        bytes32 initCodeHash,
        address deployer
    ) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            deployer,
            salt,
            initCodeHash
        )))));
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
