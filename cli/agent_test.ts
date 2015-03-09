import agent = require('./agent');
import agent_server = require('./agent_server');
import crypto = require('../lib/onepass_crypto');
import key_agent = require('../lib/key_agent');
import testLib = require('../lib/test');

testLib.addAsyncTest('store keys', (assert) => {
	var httpAgent = new agent.HttpKeyAgent();
	return httpAgent.forgetKeys().then(() => {
		return httpAgent.addKey('key1', 'mykey')
	}).then(() => {
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
	});
});

testLib.addAsyncTest('decrypt data', (assert) => {
	var httpAgent = new agent.HttpKeyAgent();

	var itemData = JSON.stringify({ secret: 'secret-data' });

	// note: The item password below contains bytes
	// legal in UTF-8 to test exchange of binary key data with the
	// agent
	var itemPass = 'the \xFFmaster\x00 key';
	var encrypted = crypto.encryptAgileKeychainItemData(new crypto.CryptoJsCrypto, itemPass, itemData);

	return httpAgent.addKey('key1', itemPass)
	.then(() => {
		return httpAgent.decrypt('key1', encrypted, new key_agent.CryptoParams(
			key_agent.CryptoAlgorithm.AES128_OpenSSLKey));
	})
	.then((decrypted) => {
		assert.equal(decrypted, itemData);
	});
});

testLib.addAsyncTest('encrypt data', (assert) => {
	var httpAgent = new agent.HttpKeyAgent();

	var itemData = JSON.stringify({ secret: 'secret-data' });
	var itemPass = 'the master key';
	var params = new key_agent.CryptoParams(key_agent.CryptoAlgorithm.AES128_OpenSSLKey);

	return httpAgent.addKey('key2', itemPass).then(() => {
		return httpAgent.encrypt('key2', itemData, params);
	}).then((encrypted) => {
		assert.equal(encrypted.slice(0, 8), 'Salted__');
		assert.ok(encrypted != itemData);
		return httpAgent.decrypt('key2', encrypted, params);
	}).then((decrypted) => {
		assert.equal(decrypted, itemData);
	});
});

testLib.teardownSuite(() => {
	agent_server.stopAgent();
});

agent_server.stopAgent().then(() => {
	testLib.start();
}).done();

