// crypto_worker implements a Web Worker for handling async
// decryption tasks off the main browser thread

import collectionutil = require('./base/collectionutil');
import env = require('./base/env');
import pbkdf2Lib = require('./crypto/pbkdf2');
import rpc = require('./net/rpc');

export var SCRIPT_PATH = env.isNodeJS() ? './build/lib/crypto_worker.js' : 'dist/scripts/crypto_worker.js';

export function setupWorker(worker: Worker) {
	var rpcHandler = new rpc.RpcHandler(new rpc.WorkerMessagePort(worker, 'passcards', 'crypto-worker'));
	rpcHandler.on('pbkdf2Block', (password: string, salt: string, iterations: number, blockIndex: number) => {
		var pbkdf2 = new pbkdf2Lib.PBKDF2();
		var passBuf = collectionutil.bufferFromString(password);
		var saltBuf = collectionutil.bufferFromString(salt);
		var derivedKeyBlock = pbkdf2.keyBlock(passBuf, saltBuf, iterations, blockIndex);
		return collectionutil.stringFromBuffer(new Uint8Array(derivedKeyBlock));
	});
}

var workerClient: Worker;
if (env.isNodeJS()) {
	var nodeworker = require('./node_worker');
	workerClient = new nodeworker.WorkerClient();
} else if (env.isWebWorker()) {
	workerClient = <any>self;
}
if (workerClient) {
	setupWorker(workerClient);
}

