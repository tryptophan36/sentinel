// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import "../contracts/HookdGuardMVP.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/**
 * @title AddLiquidityCompleteScript
 * @notice Deploys a liquidity router and adds concentrated liquidity to the HookdGuard pool
 */
contract AddLiquidityCompleteScript is Script {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // Sepolia V4 addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;  // 6 decimals
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;  // 18 decimals
    address HOOK_ADDRESS;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        HOOK_ADDRESS = vm.envAddress("NEXT_PUBLIC_HOOK_ADDRESS");

        require(USDC < WETH, "Token order mismatch");

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 120,
            hooks: IHooks(HOOK_ADDRESS)
        });

        PoolId poolId = poolKey.toId();

        console.log("=== Add Liquidity to HookdGuard Pool ===");
        console.log("Deployer:", deployer);
        console.log("Pool ID:", vm.toString(PoolId.unwrap(poolId)));
        console.log("");

        // Check pool state
        HookdGuardMVP hook = HookdGuardMVP(HOOK_ADDRESS);
        HookdGuardMVP.PoolState memory state = hook.getPoolState(poolId);
        console.log("Pool State:");
        console.log("  Baseline Volume:", state.baselineVolume);
        console.log("  Last Update Block:", state.lastUpdateBlock);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Check token balances
        uint256 usdcBalance = IERC20(USDC).balanceOf(deployer);
        uint256 wethBalance = IERC20(WETH).balanceOf(deployer);

        console.log("Token Balances:");
        console.log("  USDC:", usdcBalance, "(raw, 6 decimals)");
        console.log("  WETH:", wethBalance, "(raw, 18 decimals)");
        console.log("");

        require(usdcBalance > 0, "No USDC balance - get test tokens first");
        require(wethBalance > 0, "No WETH balance - get test tokens first");

        // Step 2: Deploy PoolModifyLiquidityTest router
        console.log("Deploying PoolModifyLiquidityTest router...");
        PoolModifyLiquidityTest router = new PoolModifyLiquidityTest(IPoolManager(POOL_MANAGER));
        console.log("Router deployed at:", address(router));

        // Step 3: Approve tokens to the router
        IERC20(USDC).approve(address(router), type(uint256).max);
        IERC20(WETH).approve(address(router), type(uint256).max);
        console.log("Approved tokens to router");
        console.log("");

        // Step 4: Add liquidity with a concentrated range around current tick
        // At 1 ETH = 2500 USDC, the pool tick is approximately 198079
        // Use a range of ±6000 ticks (50 tickSpacings of 120) for good coverage
        int24 tickLower = 192000;   // 198079 rounded down, multiple of 120
        int24 tickUpper = 204000;   // 198079 rounded up, multiple of 120

        // With this tick range and price, L = 1e13 requires ~128 USDC + ~0.05 WETH
        int256 liquidityDelta = 1e13;

        console.log("Adding concentrated liquidity...");
        console.log("  Tick Lower:", tickLower);
        console.log("  Tick Upper:", tickUpper);
        console.log("  Liquidity Delta:", liquidityDelta);
        console.log("");

        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta,
            salt: bytes32(0)
        });

        router.modifyLiquidity(poolKey, params, "");

        // Log final balances
        uint256 usdcAfter = IERC20(USDC).balanceOf(deployer);
        uint256 wethAfter = IERC20(WETH).balanceOf(deployer);

        console.log("=== Liquidity Added Successfully! ===");
        console.log("");
        console.log("Tokens used:");
        console.log("  USDC spent:", usdcBalance - usdcAfter);
        console.log("  WETH spent:", wethBalance - wethAfter);
        console.log("");
        console.log("Router address (save for future use):");
        console.log("  MODIFY_LIQUIDITY_ROUTER=", address(router));
        console.log("");
        console.log("Next: Run swap simulations:");
        console.log("  ATTACK_TYPE=1 forge script script/SimulateAttackWorking.s.sol --rpc-url sepolia --broadcast -vv");

        vm.stopBroadcast();
    }
}
