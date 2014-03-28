/// <reference path="typings/DefinitelyTyped/node/node.d.ts" />

import crypto = require('crypto');
var sjcl = require('sjcl-full');
var atob = require('atob');
var btoa = require('btoa');

var CryptoJS = require('crypto-js');

// functions in Node.js' crypto lib which
// are missing from node.d.ts
interface CryptoExtras {
	createDecipheriv(algorithm: string, key: string, iv: string) : crypto.Decipher;
	pbkdf2Sync(pwd: string, salt: string, iterCount: number, keyLen: number) : NodeBuffer;
}

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
		var decipher = (<CryptoExtras>(crypto)).createDecipheriv('AES-128-CBC', key, iv);
		var result = '';
		result += decipher.update(cipherText, 'binary', 'binary');
		result += decipher.final('binary');
		return result;
	}

	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string {
		var derivedKey = (<CryptoExtras>(crypto)).pbkdf2Sync(masterPwd, salt, iterCount, keyLen);
		return derivedKey.toString('binary');
	}

	md5Digest(input: string) : string {
		var md5er = crypto.createHash('md5');
		md5er.update(input);
		return md5er.digest('binary');
	}
}

export class CryptoJsCrypto implements CryptoImpl {
	fallbackCrypto : CryptoImpl
	encoding : any

	constructor() {
		this.fallbackCrypto = new SjclCrypto();
		this.encoding = CryptoJS.enc.Latin1;
	}

	aesCbcDecrypt(key:string, cipherText: string, iv: string) : string {
		var keyArray = this.encoding.parse(key);
		var ivArray = this.encoding.parse(iv);
		var cipherArray = this.encoding.parse(cipherText);
		var cipherParams = CryptoJS.lib.CipherParams.create({
			ciphertext: cipherArray
		});
		return CryptoJS.AES.decrypt(cipherParams, keyArray, {
			mode : CryptoJS.mode.CBC,
			padding : CryptoJS.pad.Pkcs7,
			iv: ivArray
		}).toString(this.encoding);
	}

	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string {
		// FIXME - CryptoJS' implementation of PKBDF2 scales poorly as the number
		// of iterations increases (see https://github.com/dominictarr/crypto-bench/blob/master/results.md)
		// Current versions of 1Password use 80K iterations of PBKDF2 so this needs
		// to be fast to be usable
		return this.fallbackCrypto.pbkdf2(masterPwd, salt, iterCount, keyLen);
	}
	
	md5Digest(input: string) : string {
		var encoding = CryptoJS.enc.Latin1;
		return CryptoJS.MD5(this.encoding.parse(input)).toString(this.encoding);
	}
}

export class SjclCrypto implements CryptoImpl {
	fallbackCrypto : CryptoImpl

	constructor() {
		this.fallbackCrypto = new NodeCrypto();
	}

	aesCbcDecrypt(key:string, cipherText: string, iv: string) : string {
		var keyBits = sjcl.codec.base64.toBits(btoa(key));
		var cipherBits = sjcl.codec.base64.toBits(btoa(cipherText));
		var ivBits = sjcl.codec.base64.toBits(btoa(iv));
		var aesCipher = new sjcl.cipher.aes(keyBits);
		var result = sjcl.mode.cbc.decrypt(aesCipher, cipherBits, ivBits);
		return result;
	}

	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string {
		var hmacSha1 = function(key: any) { 
			return sjcl.misc.hmac.call(this, key, sjcl.hash.sha1);
		};
		hmacSha1.prototype = sjcl.misc.hmac.prototype;

		var pwdBits = sjcl.codec.base64.toBits(btoa(masterPwd));
		var saltBits = sjcl.codec.base64.toBits(btoa(salt));
		var derivedKeyBits = sjcl.misc.pbkdf2(pwdBits, saltBits, iterCount, keyLen * 8 /* convert bytes to bits */,
		  hmacSha1);
		var result = atob(sjcl.codec.base64.fromBits(derivedKeyBits));

		return result;
	}

	md5Digest(input: string) : string {
		return this.fallbackCrypto.md5Digest(input);
	}
}

