import testLib = require('./test');
import crypto_worker = require('./crypto_worker');
import webworker_pool = require('./webworker_pool');

testLib.addAsyncTest('worker test', (assert) => {
	var scriptPath = crypto_worker.SCRIPT_PATH;
	var pool = new webworker_pool.WorkerPool<crypto_worker.Request, crypto_worker.Response>(scriptPath);
	var request = <crypto_worker.Request>{
		pass: 'inputPass',
		salt: 'inputSalt',
		iterations: 100,
		blockIndex: 0
	}

	pool.dispatch(request).then((response) => {
		assert.equal(request.id, response.requestId);
		assert.equal(response.keyBlock.length, 20);
		pool.terminate();
		testLib.continueTests();
	});
});

testLib.runTests();

