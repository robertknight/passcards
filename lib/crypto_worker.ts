// crypto_worker implements a Web Worker for handling async
// decryption tasks off the main browser thread

import pbkdf2Lib = require('./crypto/pbkdf2');

export interface Request {
	id?: number;

	pass: string;
	salt: string;
	iterations: number;

	/** When computing a key in chunks, this specifies
	  * the output block of the key to compute.
	  */
	blockIndex: number;
}

export interface Response {
	requestId: number;

	/** Block of the derived key corresponding to
	  * Request.blockIndex
	  */
	keyBlock: string;
}

export function startWorker() {
	var pbkdf2 = new pbkdf2Lib.PBKDF2();

	self.onmessage = (e) => {
		var req = <Request>e.data;
		var passBuf = pbkdf2Lib.bufferFromString(req.pass);
		var saltBuf = pbkdf2Lib.bufferFromString(req.salt);
		var derivedKeyBlock = pbkdf2.keyBlock(passBuf, saltBuf, req.iterations, req.blockIndex);
		var response = {
			requestId: req.id,
			keyBlock: pbkdf2Lib.stringFromBuffer(new Uint8Array(derivedKeyBlock))
		};

		self.postMessage(response, undefined /* ports. Optional but incorrectly marked as required in lib.d.ts */);
	}
}

if (typeof importScripts != 'undefined') {
	// running in Web Worker context
	startWorker();
}

