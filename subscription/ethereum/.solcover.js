module.exports = {
    compileCommand: 'cp ../truffle-config.js ./truffle.js && node --max-old-space-size=4096 ../node_modules/.bin/truffle compile --network coverage',
    testCommand: 'cp ../truffle-config.js ./truffle.js && node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
    copyPackages: ['openzeppelin-solidity','orbs-voting'],
    skipFiles: ['TestingERC20.sol','Migrations.sol','FakeSubscriptionChecker.sol']
};