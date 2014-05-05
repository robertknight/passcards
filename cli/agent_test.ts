import agent = require('./agent');
import agent_server = require('./agent_server');
import crypto = require('../lib/onepass_crypto');
import testLib = require('../lib/test');
import onepass = require('../lib/onepass');

testLib.addAsyncTest('store keys', (assert) => {
	var httpAgent = new agent.HttpKeyAgent();
	httpAgent.addKey('key1', 'mykey')
	.then(() => {
		return httpAgent.listKeys();
	})
	.then((keys) => {
		testLib.assertEqual(assert, keys, ['key1']);
		return httpAgent.forgetKeys();
	})
	.then(() => {
		return httpAgent.listKeys();
	})
	.then((keys) => {
		testLib.assertEqual(assert, keys, []);
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('decrypt data', (assert) => {
	var httpAgent = new agent.HttpKeyAgent();

	var itemData = JSON.stringify({secret: 'secret-data'});
	var itemPass = 'the master key';
	var itemSalt = 'item salt';
	var encrypted = crypto.encryptAgileKeychainItemData(new crypto.CryptoJsCrypto, itemPass, itemSalt, itemData);

	httpAgent.addKey('key1', itemPass)
	.then(() => {
		return httpAgent.decrypt('key1', encrypted, new onepass.CryptoParams(
			onepass.CryptoAlgorithm.AES128_OpenSSLKey, itemSalt));
	})
	.then((decrypted) => {
		assert.equal(decrypted, itemData);
		testLib.continueTests();
	})
	.done();
});

testLib.teardownSuite(() => {
	agent_server.stopAgent();
});

agent_server.stopAgent().then(() => {
	testLib.runTests();
}).done();

