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
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/**
 * @title TestPoolScript
 * @notice Simple script to test the pool and perform test swaps
 */
contract TestPoolScript is Script {
    using PoolIdLibrary for PoolKey;

    // Sepolia V4 addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    
    // Sepolia test tokens (WETH and a common test token)
    address constant TOKEN_0 = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // Sepolia USDC
    address constant TOKEN_1 = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; // Sepolia WETH
    
    function run() external {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address hookAddress = vm.envAddress("NEXT_PUBLIC_HOOK_ADDRESS");
        
        require(hookAddress != address(0), "Hook address not set in .env.local");
        
        console.log("=== Pool Test & Initialization ===");
        console.log("Pool Manager:", POOL_MANAGER);
        console.log("Hook:", hookAddress);
        console.log("Token0:", TOKEN_0);
        console.log("Token1:", TOKEN_1);
        console.log("");
        
        // Create pool key
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(TOKEN_0),
            currency1: Currency.wrap(TOKEN_1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 120,
            hooks: IHooks(hookAddress)
        });
        
        // Initial price: 1 ETH = 2500 USDC
        // raw price = token1_raw / token0_raw = 1e18 / (2500 * 1e6) = 4e8
        // sqrtPriceX96 = sqrt(4e8) * 2^96 = 20000 * 2^96
        uint160 sqrtPriceX96 = 1584563250285286751870879006720000;
        
        vm.startBroadcast(privateKey);
        
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        
        // Try to initialize pool
        try poolManager.initialize(poolKey, sqrtPriceX96) {
            console.log("Pool initialized successfully");
        } catch {
            console.log("Pool already initialized (or initialization failed)");
        }
        
        // Get pool ID
        PoolId poolId = poolKey.toId();
        bytes32 poolIdBytes = PoolId.unwrap(poolId);
        
        console.log("");
        console.log("=== Pool Details ===");
        console.log("Pool ID:", vm.toString(poolIdBytes));
        console.log("Initial Price: ~2500 USDC per ETH");
        console.log("");
        console.log("Add this to your .env.local:");
        console.log("NEXT_PUBLIC_POOL_IDS=", vm.toString(poolIdBytes));
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Update .env.local with the Pool ID above");
        console.log("2. Get test tokens from Sepolia faucets:");
        console.log("   - https://sepoliafaucet.com/ (for ETH)");
        console.log("   - Or use existing testnet tokens");
        console.log("3. Test the protection by running attack simulations");
        console.log("");
        
        vm.stopBroadcast();
    }
}
