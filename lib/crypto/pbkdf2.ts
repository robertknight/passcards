import { copyBuffer } from '../base/collectionutil';
import * as sha1 from './sha1';
import { MAC, HMAC } from './hmac';

export default class PBKDF2 {
	private createMAC: (password: Uint8Array) => MAC;

	/** Construct a PBKDF2 instance which uses @p macFn to
	  * create a MAC implementation for a given password.
	  *
	  * If not specified, HMAC-SHA1 is used.
	  */
	constructor(macFn?: (password: Uint8Array) => MAC) {
		this.createMAC = macFn;
		if (!this.createMAC) {
			this.createMAC = (password: Uint8Array) => {
				return new HMAC(new sha1.SHA1(), password);
			};
		}
	}

	/** Computes the blockIndex'th block of the PBKDF2 key for a given salt and
	  * password.
	  *
	  * Returns a key block whose length is the output digest size of the HMAC
	  * function.
	  */
	keyBlock(password: Uint8Array, salt: Uint8Array, iterations: number, blockIndex: number): ArrayBuffer {
		var hmac = this.createMAC(password);
		var paddedSalt = new Uint8Array(salt.length + 4);
		var paddedSaltView = new DataView(paddedSalt.buffer);
		copyBuffer(paddedSalt, salt);
		paddedSaltView.setInt32(salt.length, blockIndex + 1, false /* big endian */);

		var chunk = new Int32Array(hmac.digestLen() / 4);
		var chunk8 = new Uint8Array(chunk.buffer);

		hmac.mac(paddedSalt, chunk);

		var currentBlock = new Int32Array(chunk.length);
		copyBuffer(currentBlock, chunk);

		for (var i = 1; i < iterations; i++) {
			hmac.mac(chunk8, chunk);
			for (var k = 0; k < chunk.length; k++) {
				currentBlock[k] = currentBlock[k] ^ chunk[k];
			}
		}

		return currentBlock.buffer;
	}

	/** Computes a key of length @p derivedKeyLen from a given password and salt using
	  * @p iterations of the PBKDF2 algorithm.
	  */
	key(password: Uint8Array, salt: Uint8Array, iterations: number, derivedKeyLen: number): Uint8Array {
		var result = new Uint8Array(derivedKeyLen);
		var resultLen = 0;
		var hmac = this.createMAC(password);

		var blocks = sha1.roundUp(derivedKeyLen, hmac.digestLen()) / hmac.digestLen();
		for (var blockIndex = 0; blockIndex < blocks; blockIndex++) {
			var block = this.keyBlock(password, salt, iterations, blockIndex);
			var currentBlock8 = new Uint8Array(block);
			for (var i = 0; i < hmac.digestLen() && resultLen < derivedKeyLen; i++) {
				result[resultLen] = currentBlock8[i];
				++resultLen;
			}
		}

		return result;
	}
}

