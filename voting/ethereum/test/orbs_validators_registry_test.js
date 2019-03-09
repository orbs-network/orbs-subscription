
const {Driver, numToAddress} = require('./driver');
const {assertResolve, assertReject} = require('./assertExtensions');

contract('OrbsValidatorsRegistry', accounts => {
    let driver;

    beforeEach(() => {
        driver = new Driver();
    });


    describe('is not payable', () => {
        it('rejects payments', async () => {
            await driver.deployRegistry();
            await assertReject(web3.eth.sendTransaction({
                to: driver.OrbsRegistry.address,
                from: accounts[0],
                value: 1
            }), "expected payment to fail");
            assert(await web3.eth.getBalance(accounts[0]) >= 1, "expected main account to have wei");
        });
    });

    describe('when calling the isValidator() function', () => {
        it('should return true iff previously registered', async () => {
            await driver.deployRegistry();
            const validatorAddr  = accounts[3];
            const nonValidatorAddr = numToAddress(894);

            await driver.register(validatorAddr);

            assert.isOk(await driver.OrbsRegistry.isValidator(validatorAddr));
            assert.isNotOk(await driver.OrbsRegistry .isValidator(nonValidatorAddr));
        });
    });

    describe('when calling the leave() function', () => {
        it('should emit event or fail for non members', async () => {
            await driver.deployRegistry();

            await driver.register(accounts[1]);
            assert.isOk(await driver.OrbsRegistry.isValidator(accounts[1]));

            let r1 = await driver.OrbsRegistry.leave({from: accounts[1]});
            assert.equal(r1.logs[0].event, "ValidatorLeft", "expected leaving to emit event");
            assert.isNotOk(await driver.OrbsRegistry.isValidator(accounts[1]), "expected leaving to be reflected in isValidator");

            await assertReject(driver.OrbsRegistry.leave({from: accounts[1]}), "expected leave to fail after leaving once");
            await assertReject(driver.OrbsRegistry.getValidatorData(accounts[1]), "expected getValidatorData to fail after leaving");
            await assertReject(driver.OrbsRegistry.getOrbsAddress(accounts[1]), "expected getOrbsAddress to fail after leaving");
        });
    });

    describe('when register() is called', () => {
        const name = "somename";
        const url = "http://somedomain.com/";
        const orbsAddr = numToAddress(8765);
        const ip = "0x01020304"; // 4 bytes representing an address

        describe('and then getValidatorData() is called', () => {
            it('should return the entry', async () => {
                await driver.deployRegistry();

                await driver.OrbsRegistry.register(name, ip, url, orbsAddr, {from: accounts[1]});
                let result = await driver.OrbsRegistry.getValidatorData(accounts[1]);

                assert.equal(result.name, name);
                assert.equal(result.ipAddress, ip);
                assert.equal(result.website, url);
                assert.equal(result.orbsAddress, orbsAddr);
                assert.equal(result.name, result[0]);
                assert.equal(result.ipAddress, result[1]);
                assert.equal(result.website, result[2]);
                assert.equal(result.orbsAddress, orbsAddr);
            });
        });

        it('should reject invalid input', async () => {
            await driver.deployRegistry();

            await assertReject(driver.OrbsRegistry.register("", ip, url, orbsAddr));
            await assertReject(driver.OrbsRegistry.register(undefined, ip, url, orbsAddr));

            await assertResolve(driver.OrbsRegistry.register(name, ip, url, orbsAddr));

            await assertReject(driver.OrbsRegistry.register(name, ip, "", orbsAddr));
            await assertReject(driver.OrbsRegistry.register(name, ip, undefined, orbsAddr));

            await assertResolve(driver.OrbsRegistry.register(name, ip, url, orbsAddr));

            await assertReject(driver.OrbsRegistry.register(name, ip, url, "0x0"));
            await assertReject(driver.OrbsRegistry.register(name, ip, url, undefined));

            await assertResolve(driver.OrbsRegistry.register(name, ip, url, orbsAddr));
        });

        it('should reject non EOAs', async () => {
            await driver.deployRegistry();

            const ValidatorRegisteringContract = artifacts.require('ValidatorRegisteringContract');
            const name = "name";
            const ip = "0xFF00FF00";
            const url = "url";
            const orbsAddr = accounts[0];
            await assertReject(ValidatorRegisteringContract.new(
                driver.OrbsRegistry.address,
                name,
                ip,
                url,
                orbsAddr
            ), "expected registration from contract constructor to fail");

            const eoaValidatorAddr = accounts[1];
            await assertResolve(driver.OrbsRegistry.register(
                name,
                ip,
                url,
                orbsAddr,
                {from:eoaValidatorAddr}
            ), "expected registration to succeed when sent from EOA");
            assert(await driver.OrbsRegistry.isValidator(eoaValidatorAddr))
        });

        it('should reject duplicate entries', async () => {
            await driver.deployRegistry();

            const name2 = "another Name";
            const ip2 = [0,0,0,0];
            const url2 = "http://";
            const orbsAddr2 = numToAddress(39567);

            await assertResolve(driver.OrbsRegistry.register(name, ip, url, orbsAddr, {from: accounts[0]}), 'expected one account to receive value set #1');

            await assertResolve(driver.OrbsRegistry.register(name2, ip2, url2, orbsAddr2, {from: accounts[1]}), 'expected default account to succeed in setting value set #2');
            await assertResolve(driver.OrbsRegistry.register(name2, ip2, url2, orbsAddr2, {from: accounts[1]}), 'expected setting the same values twice to succeed (duplicate values for same account)');

            await assertReject(driver.OrbsRegistry.register(name, ip2, url2, orbsAddr2, {from: accounts[1]}), "expected setting duplicate name to fail");
            await assertReject(driver.OrbsRegistry.register(name2, ip2, url, orbsAddr2, {from: accounts[1]}), "expected setting duplicate url to fail");
            await assertReject(driver.OrbsRegistry.register(name2, ip2, url2, orbsAddr, {from: accounts[1]}), "expected setting duplicate orbsAddress to fail");
            await assertResolve(driver.OrbsRegistry.register(name2, ip, url2, orbsAddr2, {from: accounts[1]}), "expected setting duplicate ip to succeed");
        });

        it('should reject an ip address longer than 4 bytes', async () => {
            await driver.deployRegistry();

            await assertReject(driver.OrbsRegistry.register(name, "0x0102030400000000000001", url, orbsAddr));
            await assertResolve(driver.OrbsRegistry.register(name, "0x0102030400000000000000", url, orbsAddr));
        });
    });

    describe('when getValidatorData() is called', () => {
        it('should return an error if no data was previously set', async () => {
            await driver.deployRegistry();
            await assertReject(driver.OrbsRegistry.getValidatorData(accounts[0]));
        });
    });

    describe('when getOrbsAddress() is called', () => {
        it('should return the last address set, or an error if no data was set', async () => {
            await driver.deployRegistry();

            const orbsAddress = numToAddress(12345);

            await assertReject(driver.OrbsRegistry.getOrbsAddress(accounts[0]));

            await driver.OrbsRegistry.register("test", "0xaabbccdd", "url", orbsAddress);
            const fetchedAddress = await driver.OrbsRegistry.getOrbsAddress(accounts[0]);

            assert.equal(fetchedAddress, orbsAddress, "expected fetched address to match the value set");
        });
    });
});