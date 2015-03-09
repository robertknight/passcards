import crypto_worker = require('./crypto_worker');
import env = require('./base/env');
import rpc = require('./net/rpc');
import testLib = require('./test');

if (env.isNodeJS()) {
	Worker = require('./node_worker').Worker;
}

testLib.addAsyncTest('worker test', (assert) => {
	var scriptPath = crypto_worker.SCRIPT_PATH;
	var worker = new Worker(scriptPath);

	var rpcHandler = new rpc.RpcHandler(new rpc.WindowMessagePort(worker, '*', 'crypto-worker', 'passcards'));
	rpcHandler.call('pbkdf2Block', ['inputPass', 'inputSalt', 100 /* iterations */, 0 /* blockIndex */],
		(err: any, block: string) => {
			assert.equal(err, null);
			assert.equal(block.length, 20);
			worker.terminate();
			testLib.continueTests();
		});
});

