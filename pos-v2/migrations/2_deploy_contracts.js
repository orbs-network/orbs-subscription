const PosV2 = artifacts.require("PosV2");
const StakingContract = artifacts.require("StakingContract");
const TestingERC20 = artifacts.require('TestingERC20');

module.exports = async function(deployer) {
    const posv2 = await deployer.deploy(PosV2);
    const erc20 = await deployer.deploy(TestingERC20);
    console.log(posv2);
    await deployer.deploy(StakingContract, 1 /* _cooldownPeriodInSec */, "0x0000000000000000000000000000000000000001" /* _migrationManager */, "0x0000000000000000000000000000000000000001" /* _emergencyManager */, posv2.address /* IStakingListener */, erc20.address /* _token */);
};
