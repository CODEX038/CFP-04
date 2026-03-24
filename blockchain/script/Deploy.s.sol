// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "forge-std/Script.sol";
import "../src/CrowdfundFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        CrowdfundFactory factory = new CrowdfundFactory();
        console.log("CrowdfundFactory deployed at:", address(factory));
        vm.stopBroadcast();
    }
}
