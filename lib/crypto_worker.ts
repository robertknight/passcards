// crypto_worker implements a Web Worker for handling async
// decryption tasks off the main browser thread

import pbkdf2Lib = require('./crypto/pbkdf2');

export interface Request {
	pass: string;
	salt: string;
	iterations: number;

	/** When computing an entire key in one request,
	  * this specifies the key length to compute.
	  * Either keyLen OR blockIndex must be specified.
	  */
	keyLen?: number;

	/** When computing a key in chunks, this specifies
	  * the output block of the key to compute.
	  */
	blockIndex?: number;
}

export interface Response {
	request: Request;

	/** If Request.keyLen was set in the request, this
	  * is the computed derived key.
	  */
	key?: string;

	/** If Request.blockIndex was set in the request, this
	  * is the corresponding block of the derived key.
	  */
	keyBlock?: string;
}

export function startWorker() {
	var pbkdf2 = new pbkdf2Lib.PBKDF2();

	self.onmessage = (e) => {
		var req = <Request>e.data;
		var passBuf = pbkdf2Lib.bufferFromString(req.pass);
		var saltBuf = pbkdf2Lib.bufferFromString(req.salt);
		var response : Response;

		if (req.blockIndex !== undefined) {
			// compute a block of the output key
			var derivedKeyBlock = pbkdf2.keyBlock(passBuf, saltBuf, req.iterations, req.blockIndex);
			response = {
				request: req,
				keyBlock: pbkdf2Lib.stringFromBuffer(new Uint8Array(derivedKeyBlock))
			};
		} else {
			// compute the whole derived key
			var derivedKey = pbkdf2.key(passBuf, saltBuf, req.iterations, req.keyLen);
			response = {
				request: req,
				key: pbkdf2Lib.stringFromBuffer(derivedKey)
			};
		}

		self.postMessage(response, undefined /* ports. Optional but incorrectly marked as required in lib.d.ts */);
	}
}

if (typeof importScripts != 'undefined') {
	// running in Web Worker context
	startWorker();
}

