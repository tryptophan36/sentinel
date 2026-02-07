// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/**
 * @title InitializePoolWithHookScript
 * @notice Initialize the pool to trigger the hook's afterInitialize
 */
contract InitializePoolWithHookScript is Script {
    using PoolIdLibrary for PoolKey;

    // Sepolia addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address HOOK_ADDRESS;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    
    function run() external {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        HOOK_ADDRESS = vm.envAddress("NEXT_PUBLIC_HOOK_ADDRESS");
        
        console.log("=== Pool Initialization ===");
        console.log("Pool Manager:", POOL_MANAGER);
        console.log("Hook:", HOOK_ADDRESS);
        console.log("USDC:", USDC);
        console.log("WETH:", WETH);
        console.log("");
        
        // Create pool key with tokens in correct order
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 120,
            hooks: IHooks(HOOK_ADDRESS)
        });
        
        // Initial price: 1 ETH = 2500 USDC
        // token0 = USDC (6 decimals), token1 = WETH (18 decimals)
        // raw price = token1_raw / token0_raw = 1e18 / (2500 * 1e6) = 4e8
        // sqrtPriceX96 = sqrt(4e8) * 2^96 = 20000 * 2^96
        uint160 sqrtPriceX96 = 1584563250285286751870879006720000;
        
        vm.startBroadcast(privateKey);
        
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        
        // Try to initialize pool
        try poolManager.initialize(poolKey, sqrtPriceX96) {
            console.log("Pool initialized successfully!");
        } catch Error(string memory reason) {
            console.log("Pool initialization failed or already initialized:", reason);
        } catch {
            console.log("Pool already initialized (or initialization failed)");
        }
        
        // Get pool ID
        PoolId poolId = poolKey.toId();
        bytes32 poolIdBytes = PoolId.unwrap(poolId);
        
        console.log("");
        console.log("=== Pool Details ===");
        console.log("Pool ID:", vm.toString(poolIdBytes));
        console.log("Initial Price: ~2500 USDC per ETH (tick ~198079)");
        console.log("");
        console.log("Update your .env.local:");
        console.log("NEXT_PUBLIC_POOL_IDS=", vm.toString(poolIdBytes));
        console.log("");
        
        vm.stopBroadcast();
    }
}
