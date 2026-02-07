// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/**
 * @title InitializePoolScript
 * @notice Initializes a Uniswap V4 pool with HookdGuard protection
 * @dev Creates a native ETH/USDC pool on Sepolia (V4 native ETH = address(0))
 */
contract InitializePoolScript is Script {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // Sepolia addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    // Native ETH in V4 is address(0); no wrapping needed
    address constant NATIVE_ETH = address(0);
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address hookAddress = vm.envAddress("NEXT_PUBLIC_HOOK_ADDRESS");
        
        require(hookAddress != address(0), "Hook address not set");
        
        console.log("=== Initializing Pool (Native ETH / USDC) ===");
        console.log("Pool Manager:", POOL_MANAGER);
        console.log("Hook:", hookAddress);
        console.log("Token0 (Native ETH):", NATIVE_ETH);
        console.log("Token1 (USDC):", USDC);
        
        // Ensure tokens are in correct order (token0 < token1): address(0) < USDC
        address token0 = NATIVE_ETH;
        address token1 = USDC;
        
        // Create pool key with dynamic fee (hook controls the fee via beforeSwap override)
        // The hook sets the base 0.3% fee in afterInitialize via updateDynamicLPFee
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG, // Dynamic fee — hook overrides per-swap
            tickSpacing: 120,
            hooks: IHooks(hookAddress)
        });
        
        // Initial price: 1 ETH = 2500 USDC; token0 = ETH (18 dec), token1 = USDC (6 dec)
        // raw price = token1_raw / token0_raw = (2500 * 1e6) / 1e18 = 2.5e-9
        // sqrtPrice = sqrt(2.5e-9) = 5e-5
        // sqrtPriceX96 = 5e-5 * 2^96 = (50 * 2^96) / 1e6
        uint160 sqrtPriceX96 = 3961408125713216879677198;
        
        console.log("");
        console.log("Pool Configuration:");
        console.log("  Token0 (Native ETH):", token0);
        console.log("  Token1:", token1);
        console.log("  Fee: DYNAMIC (hook-controlled, base 0.3%)");
        console.log("  Tick Spacing: 120");
        console.log("  Initial Price (sqrtPriceX96):", sqrtPriceX96);
        console.log("  ~Price: 1 ETH = 2500 USDC");
        
        vm.startBroadcast(deployerPrivateKey);
        
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        
        // Initialize the pool
        poolManager.initialize(poolKey, sqrtPriceX96);
        
        // Calculate pool ID
        PoolId poolId = poolKey.toId();
        
        console.log("");
        console.log("=== Pool Initialized Successfully ===");
        console.log("Pool ID:", vm.toString(PoolId.unwrap(poolId)));
        console.log("");
        console.log("Add to .env.local:");
        console.log("NEXT_PUBLIC_POOL_IDS=", vm.toString(PoolId.unwrap(poolId)));
        console.log("");
        console.log("Next steps:");
        console.log("1. Add liquidity to the pool");
        console.log("2. Register as a keeper");
        console.log("3. Start simulating attacks");
        
        vm.stopBroadcast();
    }
}
