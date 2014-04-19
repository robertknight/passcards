/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

var bitsToBytes = function(n: number) {
	return n >> 3;
}

var bytesToBits = function(n: number) {
	return n << 3;
}

var roundUp = function(n: number, denom: number) {
	return n + (denom - (n % denom)) % denom;
};

var padLength = function(len: number) {
	return bitsToBytes(roundUp(bytesToBits(len) + 1 + 64, 512));
};

var hexlify = exports.hexlify = function(buf: ArrayBufferView, len?: number) {
	var hex = '';
	var byteBuf = new Uint8Array(buf.buffer);
	len = len || byteBuf.length;
	for (var i=0; i < len; i++) {
		if (byteBuf[i] < 16) {
			hex += '0';
		}
		hex += byteBuf[i].toString(16);
	}
	return hex;
};

var sha1core = function(stdlib: any, foreign: any, heap: any) : any {
	// FIXME - The 'use asm' directive here causes a
	// "'FastSha1.sha1Core' is not a constructor" error when tested
	// under Firefox 28. The code is still compiled with asm.js when
	// this directive is removed but the code then functions correctly
	// so it is commented out.
	// 
	//"use asm";

	var H : Int32Array = new stdlib.Int32Array(heap);

	function hash (k: number) {

	  k = k|0;
	  var i = 0, j = 0,
		  y0 = 0, z0 = 0, y1 = 0, z1 = 0,
		  y2 = 0, z2 = 0, y3 = 0, z3 = 0,
		  y4 = 0, z4 = 0, t0 = 0, t1 = 0;

	  y0 = H[k+0<<2>>2]|0;
	  y1 = H[k+1<<2>>2]|0;
	  y2 = H[k+2<<2>>2]|0;
	  y3 = H[k+3<<2>>2]|0;
	  y4 = H[k+4<<2>>2]|0;

	  for (i = 0; (i|0) < (k|0); i = i + 16 |0) {
		z0 = y0;
		z1 = y1;
		z2 = y2;
		z3 = y3;
		z4 = y4;

		for (j = 0; (j|0) < 16; j = j + 1 |0) {
		  t1 = H[i+j<<2>>2]|0;
		  t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | ~y1 & y3) |0) + ((t1 + y4 | 0)  +1518500249 |0) |0);
		  y4 = y3; y3 = y2; y2 = ((y1) << 30 | (y1) >>> 2); y1 = y0; y0 = t0;
		  H[k+j<<2>>2] = t1;
		}

		for (j = k + 16 |0; (j|0) < (k + 20 |0); j = j + 1 |0) {
		  t1 = (((H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2]) << 1 | (H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2]) >>> 31));
		  t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | ~y1 & y3) |0) + ((t1 + y4 | 0)  +1518500249 |0) |0);
		  y4 = y3; y3 = y2; y2 = ((y1) << 30 | (y1) >>> 2); y1 = y0; y0 = t0;
		  H[j<<2>>2] = t1;
		}

		for (j = k + 20 |0; (j|0) < (k + 40 |0); j = j + 1 |0) {
		  t1 = (((H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2]) << 1 | (H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2]) >>> 31));
		  t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 ^ y2 ^ y3) |0) + ((t1 + y4 | 0)  +1859775393 |0) |0);
		  y4 = y3; y3 = y2; y2 = ((y1) << 30 | (y1) >>> 2); y1 = y0; y0 = t0;
		  H[j<<2>>2] = t1;
		}

		for (j = k + 40 |0; (j|0) < (k + 60 |0); j = j + 1 |0) {
		  t1 = (((H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2]) << 1 | (H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2]) >>> 31));
		  t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) |0) + ((t1 + y4 | 0)  -1894007588 |0) |0);
		  y4 = y3; y3 = y2; y2 = ((y1) << 30 | (y1) >>> 2); y1 = y0; y0 = t0;
		  H[j<<2>>2] = t1;
		}

		for (j = k + 60 |0; (j|0) < (k + 80 |0); j = j + 1 |0) {
		  t1 = (((H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2]) << 1 | (H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2]) >>> 31));
		  t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 ^ y2 ^ y3) |0) + ((t1 + y4 | 0)  -899497514 |0) |0);
		  y4 = y3; y3 = y2; y2 = ((y1) << 30 | (y1) >>> 2); y1 = y0; y0 = t0;
		  H[j<<2>>2] = t1;
		}

		y0 = y0 + z0 |0;
		y1 = y1 + z1 |0;
		y2 = y2 + z2 |0;
		y3 = y3 + z3 |0;
		y4 = y4 + z4 |0;

	  }

	  H[0] = y0;
	  H[1] = y1;
	  H[2] = y2;
	  H[3] = y3;
	  H[4] = y4;

	}

	return {hash: hash};
};

export interface Hash {
	hash(src: Uint8Array, digest:Int32Array) : void;
	blockSize() : number;
	digestLen() : number;
};

// asm.js implementation of SHA-1, taken from the RushaCore()
// function in Rusha.
// As described in the Rusha documentation, this is a textbook
// implementation of SHA-1 with some loop unrolling
export class FastSha1 implements Hash {
	private heap32 : Int32Array
	private dataView : DataView
	private core : any // sha1core() instance

	constructor() {
		this.initHeap(32);
	}

	blockSize() : number {
		return 64;
	}

	digestLen() : number {
		return 20;
	}

	private initHeap(msgSize: number) {
		var WORK_SPACE_LEN = 320;
		var heapSize = padLength(msgSize) + WORK_SPACE_LEN;
		if (!this.heap32 || heapSize > this.heap32.byteLength) {
			this.heap32 = new Int32Array(heapSize >> 2);
			this.dataView = new DataView(this.heap32.buffer);
			var stdlib = { Int32Array : Int32Array };
			this.core = sha1core(stdlib, null /* foreign - unused */, this.heap32.buffer);
		}
	}

	private static copyMsgToBe32(dest: Int32Array, src: Uint8Array, srcLen: number) {
		var words = (srcLen-1) / 4 + 1
		for (var word=0; word < words - 1; word++) {
			dest[word] = src[word * 4]     << 24 |
						 src[word * 4 + 1] << 16 |
						 src[word * 4 + 2] << 8  |
						 src[word * 4 + 3];
		}
		var shift = ((srcLen % 4) - 1) * 8;
		for (var i = srcLen - (srcLen % 4); i < srcLen; i++) {
			dest[words-1] |= src[i] << shift;
			shift -= 8;
		}
	}

	static strToBuf(srcStr: string, destBuf: Uint8Array) {
		for (var i=0; i < srcStr.length; i++) {
			destBuf[i] = srcStr.charCodeAt(i);
		}
	}

	hash(src: Uint8Array, digest: Int32Array) {
		var srcLen = src.byteLength;
		this.initHeap(srcLen);
		var paddedLength = padLength(srcLen);

		// pad message with zeroes
		for (var i=0; i < paddedLength >> 2; i++) {
			this.heap32[i] = 0;
		}

		// copy message to heap in 32-bit big-endian
		// words
		FastSha1.copyMsgToBe32(this.heap32, src, srcLen);

		// append bit '1' to msg
		this.heap32[srcLen >> 2] |= 0x80 << (24 - (srcLen % 4 << 3));
		
		// append message length in bits as a 64bit big-endian int
		//this.heap32[(srcLen >> 2) + 2] = bytesToBits(srcLen);
		// TODO - Understand where msgLenPos comes from
		var msgLenPos = (((srcLen >> 2) + 2) & ~0x0f) + 15;
		this.heap32[msgLenPos] = srcLen << 3;

		// final message size should now be a multiple of 64 bytes
		// (512 bits, 16 i32 words)

		// initialize working state - stored at the end of the heap
		// after the message
		var workSpace = paddedLength >> 2;
		this.heap32[workSpace]   = 1732584193;
		this.heap32[workSpace+1] = -271733879;
		this.heap32[workSpace+2] = -1732584194;
		this.heap32[workSpace+3] = 271733878;
		this.heap32[workSpace+4] = -1009589776;

		// call Rusha core
		var msgWords = paddedLength >> 2;
		this.core.hash(msgWords);
		
		// copy result to digest
		for (var i=0; i < 5; i++) {
			digest[i] = this.dataView.getInt32(i << 2, false /* big endian */);
		}
	}
}

export class HMAC {
	private hash : Hash;
	private blockSize : number;
	private workSpace : Uint8Array;
	private digest : Int32Array;
	private digest8 : Uint8Array

	private innerKeyPad : Uint8Array;
	private outerKey : Uint8Array;

	constructor(hash: Hash, key: Uint8Array) {
		this.hash = hash;
		this.blockSize = this.hash.blockSize();
		this.digest = new Int32Array(this.hash.digestLen() / 4);
		this.digest8 = new Uint8Array(this.digest.buffer);
		
		this.innerKeyPad = new Uint8Array(this.blockSize);
		this.outerKey = new Uint8Array(this.blockSize + this.digest.byteLength);

		// shorten key if longer than block length
		if (key.length > this.blockSize) {
			var shortKey = new Uint8Array(this.blockSize);
			this.hash.hash(key, this.digest);
			for (var i=0; i < shortKey.length; i++) {
				shortKey[i] = this.digest8[i];
			}
			key = shortKey;
		}

		// pad key to block length
		if (key.length < this.blockSize) {
			var paddedKey = new Uint8Array(this.blockSize);
			for (var i=0; i < key.length; i++) {
				paddedKey[i] = key[i];
			}
			key = paddedKey;
		}
		for (var i=key.length; i < this.blockSize; i++) {
			key[i] = 0;
		}

		// setup inner key padding
		for (var i=0; i < this.innerKeyPad.length; i++) {
			this.innerKeyPad[i] = 0x36 ^ key[i];
		}
		for (var i=0; i < this.outerKey.length; i++) {
			this.outerKey[i] = 0x5c ^ key[i];
		}
	}

	mac(message: Uint8Array, hmac: Int32Array) {
		// inner key padding
		var workSpaceLen = this.blockSize + message.length;
		if (!this.workSpace || this.workSpace.byteLength != workSpaceLen) {
			this.workSpace = new Uint8Array(workSpaceLen);
		}

		for (var i=0; i < this.blockSize; i++) {
			this.workSpace[i] = this.innerKeyPad[i];
		}
		for (var i=0; i < message.length; i++) {
			this.workSpace[this.blockSize + i] = message[i];
		}
		this.hash.hash(this.workSpace, this.digest);
		
		// outer key padding
		for (var i=0; i < this.digest.byteLength; i++) {
			this.outerKey[this.blockSize + i] = this.digest8[i];
		}
		this.hash.hash(this.outerKey, hmac);
	}
};

