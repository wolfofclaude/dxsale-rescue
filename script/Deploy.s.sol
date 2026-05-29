// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Deploy RescueExecutor to BNB Smart Chain.
//   FEE_WALLET   = address that receives the 15% fee (your vanity wallet)
//   PRIVATE_KEY  = deployer key (export from wallet.json; needs BNB for gas)
//
// Simulate (no broadcast, no funds):
//   forge script script/Deploy.s.sol:Deploy
// Deploy + auto-verify on BscScan:
//   forge script script/Deploy.s.sol:Deploy --rpc-url bsc --broadcast --verify

import {Script, console2} from "forge-std/Script.sol";
import {RescueExecutor} from "../contracts/RescueExecutor.sol";

contract Deploy is Script {
    function run() external {
        address feeWallet = vm.envAddress("FEE_WALLET");
        uint256 pk = vm.envUint("PRIVATE_KEY");
        require(feeWallet != address(0), "FEE_WALLET unset");

        vm.startBroadcast(pk);
        RescueExecutor exec = new RescueExecutor(feeWallet);
        vm.stopBroadcast();

        console2.log("RescueExecutor deployed:", address(exec));
        console2.log("feeWallet:", exec.feeWallet());
        console2.log("FEE_BPS:", exec.FEE_BPS());
    }
}
