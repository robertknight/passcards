/// <reference path="typings/node/node.d.ts" />

import crypto = require('crypto');

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
		return (<CryptoExtras>(crypto)).pbkdf2Sync(masterPwd, salt, iterCount, keyLen).toString('binary');
	}

	md5Digest(input: string) : string {
		var md5er = crypto.createHash('md5');
		md5er.update(input);
		return md5er.digest('binary');
	}
}

