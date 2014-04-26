/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

import crypto = require('crypto');
import sha1opt = require('./crypto/sha1opt');

var cryptoJS = require('crypto-js');

// interface for crypto functions required for
// working with 1Password vaults
export interface CryptoImpl {
	aesCbcDecrypt(key:string, cipherText: string, iv: string) : string;
	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string;
	md5Digest(input: string) : string;
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

	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string {
		var derivedKey = crypto.pbkdf2Sync(masterPwd, salt, iterCount, keyLen);
		return derivedKey.toString('binary');
	}

	md5Digest(input: string) : string {
		var md5er = crypto.createHash('md5');
		md5er.update(input);
		return md5er.digest('binary');
	}
}

// crypto implementation using CryptoJS plus the
// crypto functions in lib/crypto
export class CryptoJsCrypto implements CryptoImpl {
	encoding : any

	constructor() {
		this.encoding = cryptoJS.enc.Latin1;
	}

	aesCbcDecrypt(key:string, cipherText: string, iv: string) : string {
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

		var pbkdf2Impl = new sha1opt.PBKDF2();
		var passBuf = sha1opt.bufferFromString(masterPwd);
		var saltBuf = sha1opt.bufferFromString(salt);
		var key = pbkdf2Impl.key(passBuf, saltBuf, iterCount, keyLen);
		return sha1opt.stringFromBuffer(key);
	}
	
	md5Digest(input: string) : string {
		return cryptoJS.MD5(this.encoding.parse(input)).toString(this.encoding);
	}
}

