/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/node-uuid/node-uuid.d.ts" />

import assert = require('assert');
import crypto = require('crypto');
var cryptoJS = require('crypto-js');
import Q = require('q');
import underscore = require('underscore');
import uuid = require('node-uuid');

import collectionutil = require('./base/collectionutil');
import crypto_worker = require('./crypto_worker');
import pbkdf2Lib = require('./crypto/pbkdf2');
import rpc = require('./net/rpc');

// see https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
interface WebCrypto {
	getRandomValues<T extends ArrayBufferView>(buffer: T): T;
}

interface Window {
	crypto: WebCrypto;
}

export class AESKeyParams {
	constructor(public key: string, public iv: string) {
	}
}

export class SaltedCipherText {
	constructor(public salt: string, public cipherText: string) {
	}
}

export function extractSaltAndCipherText(input: string) : SaltedCipherText {
	if (input.slice(0, 8) != 'Salted__') {
		throw 'Ciphertext missing salt';
	}
	var salt = input.substring(8, 16);
	var cipher = input.substring(16);
	return new SaltedCipherText(salt, cipher);
}

/** Derives an AES-128 key and initialization vector from a key of arbitrary length and salt
  * using.
  */
export function openSSLKey(cryptoImpl: Crypto, password: string, salt: string) : AESKeyParams {
	var data = password + salt;
	var key = cryptoImpl.md5Digest(data);
	var iv = cryptoImpl.md5Digest(key + data);
	return new AESKeyParams(key, iv);
}

/** Encrypt the JSON data for an item for storage in the Agile Keychain format. */
export function encryptAgileKeychainItemData(cryptoImpl: Crypto, key: string, plainText: string) {
	var salt = randomBytes(8);
	var keyParams = openSSLKey(cryptoImpl, key, salt);
	return 'Salted__' + salt + cryptoImpl.aesCbcEncrypt(keyParams.key, plainText, keyParams.iv);
}

/** Decrypt the encrypted contents of an item stored in the Agile Keychain format. */
export function decryptAgileKeychainItemData(cryptoImpl: Crypto, key: string, cipherText: string) {
	var saltCipher = extractSaltAndCipherText(cipherText);
	var keyParams = openSSLKey(cryptoImpl, key, saltCipher.salt);
	return cryptoImpl.aesCbcDecrypt(keyParams.key, saltCipher.cipherText, keyParams.iv);
}

/** Generate a V4 (random) UUID */
export function newUUID() : string {
	return uuid.v4().toUpperCase().replace(/-/g,'');
}

/** Generate a buffer of @p length strong pseudo-random bytes */
export function randomBytes(length: number) : string {
	// use browser's PRNG if available
	if (typeof window != 'undefined') {
		var theWindow = <Window><any>window;
		if (theWindow.crypto && theWindow.crypto.getRandomValues) {
			var buffer = new Uint8Array(length);
			return collectionutil.stringFromBuffer(theWindow.crypto.getRandomValues(buffer));
		}
	}

	// fall back to NodeJS' PRNG otherwise
	if (crypto.pseudoRandomBytes) {
		return crypto.pseudoRandomBytes(length).toString('binary');
	}

	// fall back to Math.random()-based PRNG
	return cryptoJS.lib.WordArray.random(length).toString(this.encoding);
}

var DEFAULT_PASSWORD_CHARSETS = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                                 "abcdefghijklmnopqrstuvwxyz",
                                 "0123456789"];

/** Generate a new random password. */
export function generatePassword(length: number, charsets?: string[]) : string {
	charsets = charsets || DEFAULT_PASSWORD_CHARSETS;
	var fullCharset = charsets.join('');

	var genCandidate = (length: number) => {
		var candidate = '';
		var sectionSize = 3;
		while (candidate.length < length) {
			var buffer = randomBytes(100);
			for (var i=0; candidate.length < length && i < buffer.length; i++) {
				if ((candidate.length % (sectionSize+1) == sectionSize) &&
				    (length - candidate.length > 1)) {
					candidate += '-';
				}
				if (buffer.charCodeAt(i) < fullCharset.length) {
					candidate += fullCharset[buffer.charCodeAt(i)];
				}
			}
		}
		return candidate;
	}
	while (true) {
		// generate a candiate, check that it contains at least one
		// character from each of the charsets
		var candidate = genCandidate(length);
		var charsetMatches = new Array(charsets.length);

		for (var i=0; i < candidate.length; i++) {
			for (var k=0; k < charsetMatches.length; k++) {
				charsetMatches[k] = charsetMatches[k] || charsets[k].indexOf(candidate[i]) != -1;
			}
		}
		if (underscore.every(charsetMatches, (match: boolean) => {
			return match;
		})) {
			return candidate;
		}
	}
}

/** Crypto is an interface to common crypto algorithms required
  * to decrypt Agile Keychain vaults.
  */
export interface Crypto {
	/** Decrypt @p cipherText using AES-128 with the given key and initialization vector.
	  */
	aesCbcDecrypt(key:string, cipherText: string, iv: string) : string;
	aesCbcEncrypt(key:string, plainText: string, iv: string) : string;

	/** Derive a key of length @p keyLen from a password using @p iterCount iterations
	  * of PBKDF2
	  */
	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : Q.Promise<string>;

	pbkdf2Sync(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string;

	md5Digest(input: string) : string;
}

// crypto implementation using Node.js' crypto lib
export class NodeCrypto implements Crypto {
	aesCbcDecrypt(key:string, cipherText: string, iv: string) : string {
		var decipher = crypto.createDecipheriv('AES-128-CBC', key, iv);
		var result = '';
		result += decipher.update(cipherText, 'binary', 'binary');
		result += decipher.final('binary');
		return result;
	}

	aesCbcEncrypt(key:string, plainText: string, iv: string) : string {
		var cipher = crypto.createCipheriv('AES-128-CBC', key, iv);
		var result = '';
		result += cipher.update(plainText, 'binary', 'binary');
		result += cipher.final('binary');
		return result;
	}

	pbkdf2Sync(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string {
		var derivedKey = crypto.pbkdf2Sync(masterPwd, salt, iterCount, keyLen);
		return derivedKey.toString('binary');
	}

	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : Q.Promise<string> {
		var key = Q.defer<string>();
		// FIXME - Type definition for crypto.pbkdf2() is wrong, result
		// is a Buffer, not a string.
		crypto.pbkdf2(masterPwd, salt, iterCount, keyLen, (err, derivedKey) => {
			if (err) {
				key.reject(err);
				return;
			}
			key.resolve((<any>derivedKey).toString('binary'));
		});
		return key.promise;
	}

	md5Digest(input: string) : string {
		var md5er = crypto.createHash('md5');
		md5er.update(input);
		return md5er.digest('binary');
	}
}

interface WorkerAndRpc {
	worker: Worker;
	rpc: rpc.RpcHandler;
}

// crypto implementation using CryptoJS plus the
// crypto functions in lib/crypto
export class CryptoJsCrypto implements Crypto {
	static workers: WorkerAndRpc[];
	encoding : any

	/** Setup workers for async encryption tasks
	  */
	static initWorkers() {
		if (typeof Worker != 'undefined') {
			var script = crypto_worker.SCRIPT_PATH;

			CryptoJsCrypto.workers = [];
			for (var i=0; i < 2; i++) {
				var worker = new Worker(script);
				var rpcHandler = new rpc.RpcHandler(new rpc.WorkerMessagePort(worker, 'crypto-worker', 'passcards'));
				CryptoJsCrypto.workers.push({
					worker: worker,
					rpc: rpcHandler
				});
			}
		}
	}

	constructor() {
		this.encoding = cryptoJS.enc.Latin1;
	}

	aesCbcEncrypt(key:string, plainText: string, iv: string) : string {
		assert.equal(key.length, 16);
		assert.equal(iv.length, 16);

		var keyArray = this.encoding.parse(key);
		var ivArray = this.encoding.parse(iv);
		var plainArray = this.encoding.parse(plainText);
		var encrypted = cryptoJS.AES.encrypt(plainArray, keyArray, {
			mode: cryptoJS.mode.CBC,
			padding: cryptoJS.pad.Pkcs7,
			iv: ivArray
		});
		return encrypted.ciphertext.toString(this.encoding);
	}

	aesCbcDecrypt(key:string, cipherText: string, iv: string) : string {
		assert.equal(key.length, 16);
		assert.equal(iv.length, 16);

		var keyArray = this.encoding.parse(key);
		var ivArray = this.encoding.parse(iv);
		var cipherArray = this.encoding.parse(cipherText);
		var cipherParams = cryptoJS.lib.CipherParams.create({
			ciphertext: cipherArray
		});
		return cryptoJS.AES.decrypt(cipherParams, keyArray, {
			mode : cryptoJS.mode.CBC,
			padding : cryptoJS.pad.Pkcs7,
			iv: ivArray
		}).toString(this.encoding);
	}

	/** Derive a key from a password using PBKDF2. Depending on the number of iterations,
	  * this process can be expensive and can block the UI in the browser.
	  */
	pbkdf2Sync(pass: string, salt: string, iterCount: number, keyLen: number) : string {
		// CryptoJS' own implementation of PKBDF2 scales poorly as the number
		// of iterations increases (see https://github.com/dominictarr/crypto-bench/blob/master/results.md)
		//
		// Current versions of 1Password use 80K iterations of PBKDF2 so this needs
		// to be fast to be usable, especially on mobile devices.
		//
		// Hence we use a custom implementation of PBKDF2 based on Rusha

		var pbkdf2Impl = new pbkdf2Lib.PBKDF2();
		var passBuf = collectionutil.bufferFromString(pass);
		var saltBuf = collectionutil.bufferFromString(salt);
		var key = pbkdf2Impl.key(passBuf, saltBuf, iterCount, keyLen);
		return collectionutil.stringFromBuffer(key);
	}

	/** Derive a key from a password using PBKDF2. If initWorkers() has been called,
	  * this will run asynchronously and in parallel in a worker, otherwise it will fall back to
	  * pbkdf2Sync()
	  */
	pbkdf2(pass: string, salt: string, iterCount: number, keyLen: number) : Q.Promise<string> {
		if (CryptoJsCrypto.workers) {
			var keyBlocks: Q.Promise<string>[] = [];
			var PBKDF2_BLOCK_SIZE = 20;
			var blockCount = Math.round(keyLen / PBKDF2_BLOCK_SIZE);

			var processBlock = (blockIndex: number, keyBlock: Q.Deferred<string>) => {
				var rpc = CryptoJsCrypto.workers[blockIndex % CryptoJsCrypto.workers.length].rpc;
				rpc.call('pbkdf2Block', [pass, salt, iterCount, blockIndex], keyBlock.makeNodeResolver());
			};

			for (var blockIndex=0; blockIndex < blockCount; blockIndex++) {
				var keyBlock = Q.defer<string>();
				processBlock(blockIndex, keyBlock);
				keyBlocks.push(keyBlock.promise);
			}

			return Q.all(keyBlocks).then((blocks) => {
				return blocks.join('').slice(0, keyLen);
			});
		} else {
			// fall back to sync calculation
			return Q(this.pbkdf2Sync(pass, salt, iterCount, keyLen));
		}
	}

	md5Digest(input: string) : string {
		return cryptoJS.MD5(this.encoding.parse(input)).toString(this.encoding);
	}

	randomBytes(length: number) : string {
		// use browser's PRNG if available
		if (typeof window != 'undefined') {
			var theWindow = <Window><any>window;
			if (theWindow.crypto && theWindow.crypto.getRandomValues) {
				var buffer = new Uint8Array(length);
				return collectionutil.stringFromBuffer(theWindow.crypto.getRandomValues(buffer));
			}
		}

		// fall back to NodeJS' PRNG otherwise
		if (crypto.pseudoRandomBytes) {
			return crypto.pseudoRandomBytes(length).toString('binary');
		}

		// fall back to Math.random()-based PRNG
		return cryptoJS.lib.WordArray.random(length).toString(this.encoding);
	}
}

export var defaultCrypto = new CryptoJsCrypto();
