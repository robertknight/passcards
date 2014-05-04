import agent = require('./agent');
import agent_server = require('./agent_server');
import testLib = require('./lib/test');
//import onepass = require('./lib/onepass');

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

/*testLib.addAsyncTest('decrypt data', (assert) => {
	var httpAgent = new agent.HttpKeyAgent();
	httpAgent.addKey('key1', 'somekey')
	.then(() => {
		return httpAgent.decrypt('key1', 'ciphertext', new onepass.CryptoParams(
			onepass.CryptoAlgorithm.AES128_OpenSSLKey, 'salt'));
	})
	.then((decrypted) => {
		assert.equal(decrypted, 'decrypted content');
		testLib.continueTests();
	})
	.done();
});*/

testLib.teardownSuite(() => {
	agent_server.stopAgent();
});

agent_server.stopAgent().then(() => {
	testLib.runTests();
}).done();

