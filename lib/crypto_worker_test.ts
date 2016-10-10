import crypto_worker = require('./crypto_worker');
import env = require('./base/env');
import rpc = require('./net/rpc');
import { defer } from './base/promise_util';
import testLib = require('./test');

if (env.isNodeJS()) {
	(global as any).Worker = require('./node_worker').Worker;
}

testLib.addAsyncTest('worker test', (assert) => {
	let done = defer<void>();

	let scriptPath = crypto_worker.SCRIPT_PATH;
	let worker = new Worker(scriptPath);

	let rpcHandler = new rpc.RpcHandler(new rpc.WindowMessagePort(worker, '*', 'crypto-worker', 'passcards'));
	rpcHandler.call('pbkdf2Block', ['inputPass', 'inputSalt', 100 /* iterations */, 0 /* blockIndex */],
		(err: any, block: string) => {
			assert.equal(err, null);
			assert.equal(block.length, 20);
			worker.terminate();
			done.resolve(null);
		});

	return done.promise;
});
