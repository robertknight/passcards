/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/node-uuid/node-uuid.d.ts" />

import assert = require('assert');
import crypto = require('crypto');
var cryptoJS = require('crypto-js');
import uuid = require('node-uuid');

import pbkdf2Lib = require('./crypto/pbkdf2');

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
export function openSSLKey(cryptoImpl: CryptoImpl, password: string, salt: string) : AESKeyParams {
	var data = password + salt;
	var key = cryptoImpl.md5Digest(data);
	var iv = cryptoImpl.md5Digest(key + data);
	return new AESKeyParams(key, iv);
}

/** Encrypt the JSON data for an item for storage in the Agile Keychain format. */
export function encryptAgileKeychainItemData(cryptoImpl: CryptoImpl, key: string, plainText: string) {
	var salt = cryptoImpl.randomBytes(8);
	var keyParams = openSSLKey(cryptoImpl, key, salt);
	return 'Salted__' + salt + cryptoImpl.aesCbcEncrypt(keyParams.key, plainText, keyParams.iv);
}

/** Decrypt the encrypted contents of an item stored in the Agile Keychain format. */
export function decryptAgileKeychainItemData(cryptoImpl: CryptoImpl, key: string, cipherText: string) {
	var saltCipher = extractSaltAndCipherText(cipherText);
	var keyParams = openSSLKey(cryptoImpl, key, saltCipher.salt);
	return cryptoImpl.aesCbcDecrypt(keyParams.key, saltCipher.cipherText, keyParams.iv);
}

/** Generate a V4 (random) UUID */
export function newUUID() : string {
	return uuid.v4().toUpperCase().replace(/-/g,'');
}

/** CryptoImpl is an interface to common crypto algorithms required
  * to decrypt Agile Keychain vaults.
  */
export interface CryptoImpl {
	/** Decrypt @p cipherText using AES-128 with the given key and initialization vector.
	  */
	aesCbcDecrypt(key:string, cipherText: string, iv: string) : string;
	aesCbcEncrypt(key:string, plainText: string, iv: string) : string;

	/** Derive a key of length @p keyLen from a password using @p iterCount iterations
	  * of PBKDF2
	  */
	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string;

	md5Digest(input: string) : string;

	/** Returns a buffer of @p length random bytes of strong pseudo-random data.
	  */
	randomBytes(length: number) : string;
}

// crypto implementation using Node.js' crypto lib
export class NodeCrypto implements CryptoImpl {
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

	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string {
		var derivedKey = crypto.pbkdf2Sync(masterPwd, salt, iterCount, keyLen);
		return derivedKey.toString('binary');
	}

	md5Digest(input: string) : string {
		var md5er = crypto.createHash('md5');
		md5er.update(input);
		return md5er.digest('binary');
	}

	randomBytes(length: number) : string {
		return crypto.pseudoRandomBytes(length).toString('binary');
	}
}

// crypto implementation using CryptoJS plus the
// crypto functions in lib/crypto
export class CryptoJsCrypto implements CryptoImpl {
	encoding : any

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

	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string {
		// CryptoJS' own implementation of PKBDF2 scales poorly as the number
		// of iterations increases (see https://github.com/dominictarr/crypto-bench/blob/master/results.md)
		//
		// Current versions of 1Password use 80K iterations of PBKDF2 so this needs
		// to be fast to be usable, especially on mobile devices.
		//
		// Hence we use a custom implementation of PBKDF2 based on Rusha

		var pbkdf2Impl = new pbkdf2Lib.PBKDF2();
		var passBuf = pbkdf2Lib.bufferFromString(masterPwd);
		var saltBuf = pbkdf2Lib.bufferFromString(salt);
		var key = pbkdf2Impl.key(passBuf, saltBuf, iterCount, keyLen);
		return pbkdf2Lib.stringFromBuffer(key);
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
				return pbkdf2Lib.stringFromBuffer(theWindow.crypto.getRandomValues(buffer));
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

