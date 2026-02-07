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
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import "../contracts/HookdGuardMVP.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/**
 * @title RunSwapsScript
 * @notice Execute a series of small swaps to test the protection system
 *         and generate on-chain Swap events visible in the UI
 */
contract RunSwapsScript is Script {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // Sepolia addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POOL_SWAP_TEST = 0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe;
    address constant HOOK_ADDRESS = 0xdE28c71C1275E8e4A0BF14025e9746cFA0fCd0C0;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 120,
            hooks: IHooks(HOOK_ADDRESS)
        });

        PoolId poolId = poolKey.toId();
        HookdGuardMVP hook = HookdGuardMVP(HOOK_ADDRESS);

        console.log("=== Swap Test for HookdGuard ===");
        console.log("Deployer:", deployer);
        console.log("");

        // Check initial state
        HookdGuardMVP.PoolState memory stateBefore = hook.getPoolState(poolId);
        console.log("Before swaps:");
        console.log("  Recent Volume:", stateBefore.recentVolume);
        console.log("  Baseline Volume:", stateBefore.baselineVolume);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Approve tokens to PoolSwapTest
        IERC20(USDC).approve(POOL_SWAP_TEST, type(uint256).max);
        IERC20(WETH).approve(POOL_SWAP_TEST, type(uint256).max);
        console.log("Approved tokens");

        // Execute several small swaps (USDC -> WETH, exact input)
        // Using small amounts that fit within our concentrated liquidity
        // Each swap is ~10 USDC (10e6 raw) exact input
        uint256 swapAmount = 10e6; // 10 USDC

        console.log("");
        console.log("=== Executing 3 Swaps ===");

        // Swap 1: USDC -> WETH (zeroForOne = true)
        console.log("Swap 1: 10 USDC -> WETH (exact input)");
        doSwap(poolKey, true, swapAmount);

        // Swap 2: Another USDC -> WETH
        console.log("Swap 2: 10 USDC -> WETH (exact input)");
        doSwap(poolKey, true, swapAmount);

        // Swap 3: Another USDC -> WETH
        console.log("Swap 3: 10 USDC -> WETH (exact input)");
        doSwap(poolKey, true, swapAmount);

        vm.stopBroadcast();

        // Check final state
        HookdGuardMVP.PoolState memory stateAfter = hook.getPoolState(poolId);
        console.log("");
        console.log("After swaps:");
        console.log("  Recent Volume:", stateAfter.recentVolume);
        console.log("  Baseline Volume:", stateAfter.baselineVolume);
        console.log("");
        console.log("=== Done! Check the Pools page in the UI ===");
    }

    function doSwap(PoolKey memory poolKey, bool zeroForOne, uint256 amount) internal {
        PoolSwapTest swapTest = PoolSwapTest(POOL_SWAP_TEST);

        // Negative amountSpecified = exact input
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amount),
            sqrtPriceLimitX96: zeroForOne
                ? 4295128740            // Min sqrt price limit
                : 1461446703485210103287273052203988822378723970341 // Max sqrt price limit
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        try swapTest.swap(poolKey, params, settings, "") {
            console.log("  -> Success");
        } catch Error(string memory reason) {
            console.log("  -> Failed:", reason);
        } catch (bytes memory) {
            console.log("  -> Failed (low-level revert)");
        }
    }
}
