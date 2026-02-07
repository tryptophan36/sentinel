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
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import "../contracts/HookdGuardMVP.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

/**
 * @title AddMoreLiquidityScript
 * @notice Adds more liquidity using the already-deployed router
 */
contract AddMoreLiquidityScript is Script {
    using PoolIdLibrary for PoolKey;

    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    address constant HOOK_ADDRESS = 0xdE28c71C1275E8e4A0BF14025e9746cFA0fCd0C0;
    address constant ROUTER = 0x9953697BA9Db14f12a898a89B99dfA8340330145;

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

        console.log("=== Add More Liquidity ===");
        console.log("Deployer:", deployer);
        console.log("Router:", ROUTER);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        uint256 usdcBalance = IERC20(USDC).balanceOf(deployer);
        uint256 wethBalance = IERC20(WETH).balanceOf(deployer);

        console.log("Current Balances:");
        console.log("  USDC (raw):", usdcBalance);
        console.log("  WETH (raw):", wethBalance);
        console.log("");

        // Approve tokens to the existing router (in case previous approvals expired)
        IERC20(USDC).approve(ROUTER, type(uint256).max);
        IERC20(WETH).approve(ROUTER, type(uint256).max);

        // At tick ~198079 (1 ETH = 2500 USDC), L = 1e13 needs ~128 USDC + ~0.05 WETH
        // Use 80% of USDC balance to estimate max liquidity
        uint256 usableUsdc = usdcBalance * 80 / 100;
        uint256 maxLiquidity = usableUsdc * 1e13 / (128 * 1e6); // ~128 USDC per 1e13 liquidity
        if (maxLiquidity == 0) maxLiquidity = 1e13;

        int256 liquidityDelta = int256(maxLiquidity);

        console.log("Adding liquidity:");
        console.log("  Liquidity Delta:", liquidityDelta);
        console.log("  Tick Range: 192000 to 204000 (around tick 198079)");
        console.log("");

        PoolModifyLiquidityTest router = PoolModifyLiquidityTest(ROUTER);

        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: 192000,
            tickUpper: 204000,
            liquidityDelta: liquidityDelta,
            salt: bytes32(uint256(1)) // Different salt to avoid collision with first position
        });

        router.modifyLiquidity(poolKey, params, "");

        uint256 usdcAfter = IERC20(USDC).balanceOf(deployer);
        uint256 wethAfter = IERC20(WETH).balanceOf(deployer);

        console.log("=== Success! ===");
        console.log("  USDC spent:", usdcBalance - usdcAfter);
        console.log("  WETH spent:", wethBalance - wethAfter);
        console.log("  USDC remaining:", usdcAfter);

        vm.stopBroadcast();
    }
}
