// crypto_worker implements a Web Worker for handling async
// decryption tasks off the main browser thread

import pbkdf2Lib = require('./crypto/pbkdf2');

export interface Request {
	pass: string;
	salt: string;
	iterations: number;
	keyLen: number;
}

export interface Response {
	request: Request;
	key: string;
}

export function startWorker() {
	var pbkdf2 = new pbkdf2Lib.PBKDF2();

	self.onmessage = (e) => {
		var req = <Request>e.data;
		var passBuf = pbkdf2Lib.bufferFromString(req.pass);
		var saltBuf = pbkdf2Lib.bufferFromString(req.salt);
		var derivedKey = pbkdf2.key(passBuf, saltBuf, req.iterations, req.keyLen);
		var response = <Response>{
			request: req,
			key: pbkdf2Lib.stringFromBuffer(derivedKey)
		};
		self.postMessage(response, undefined /* ports. Optional but incorrectly marked as required in lib.d.ts */);
	}
}

if (typeof importScripts != 'undefined') {
	// running in Web Worker context
	startWorker();
}

