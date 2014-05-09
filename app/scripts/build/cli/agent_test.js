var agent = require('./agent');
var agent_server = require('./agent_server');
var crypto = require('../lib/onepass_crypto');
var testLib = require('../lib/test');
var onepass = require('../lib/onepass');

testLib.addAsyncTest('store keys', function (assert) {
    var httpAgent = new agent.HttpKeyAgent();
    httpAgent.addKey('key1', 'mykey').then(function () {
        return httpAgent.listKeys();
    }).then(function (keys) {
        testLib.assertEqual(assert, keys, ['key1']);
        return httpAgent.forgetKeys();
    }).then(function () {
        return httpAgent.listKeys();
    }).then(function (keys) {
        testLib.assertEqual(assert, keys, []);
        testLib.continueTests();
    }).done();
});

testLib.addAsyncTest('decrypt data', function (assert) {
    var httpAgent = new agent.HttpKeyAgent();

    var itemData = JSON.stringify({ secret: 'secret-data' });
    var itemPass = 'the master key';
    var itemSalt = 'item salt';
    var encrypted = crypto.encryptAgileKeychainItemData(new crypto.CryptoJsCrypto, itemPass, itemSalt, itemData);

    httpAgent.addKey('key1', itemPass).then(function () {
        return httpAgent.decrypt('key1', encrypted, new onepass.CryptoParams(0 /* AES128_OpenSSLKey */, itemSalt));
    }).then(function (decrypted) {
        assert.equal(decrypted, itemData);
        testLib.continueTests();
    }).done();
});

testLib.teardownSuite(function () {
    agent_server.stopAgent();
});

agent_server.stopAgent().then(function () {
    testLib.runTests();
}).done();
//# sourceMappingURL=agent_test.js.map
