
var md5 = require('crypto-js/md5');
var encLatin1 = require('crypto-js/enc-latin1');
import node_crypto = require('crypto');
import uuid = require('node-uuid');

import { btoa } from './base/stringutil';
import agile_keychain_entries = require('./agile_keychain_entries');
import crypto = require('./base/crypto');
import key_agent = require('./key_agent');
import rpc = require('./net/rpc');
import { bufferFromString, stringFromBuffer } from './base/collectionutil';

export class AESKeyParams {
	constructor(public key: string, public iv: string) {
	}
}

export class SaltedCipherText {
	constructor(public salt: string, public cipherText: string) {
	}
}

/** Generate encryption keys for an Agile Keychain vault from
  * a given password.
  *
  * This function generates a new random 1024-byte encryption key
  * for a vault and encrypts it using a key derived from @p password
  * using @p passIterations iterations of PBKDF2.
  */
export function generateMasterKey(password: string, passIterations: number): Promise<agile_keychain_entries.EncryptionKeyList> {
	let masterKey = crypto.randomBytes(1024);
	let salt = crypto.randomBytes(8);

	return key_agent.keyFromPassword(password, salt, passIterations).then(derivedKey => {
		return key_agent.encryptKey(derivedKey, masterKey);
	}).then(encryptedKey => {
		let masterKeyEntry = {
			data: btoa('Salted__' + salt + encryptedKey.key),
			identifier: newUUID(),
			iterations: passIterations,
			level: 'SL5',
			validation: btoa(encryptedKey.validation)
		};

		return <agile_keychain_entries.EncryptionKeyList>{
			list: [masterKeyEntry],
			SL5: masterKeyEntry.identifier
		};
	});
}

export function extractSaltAndCipherText(input: string): SaltedCipherText {
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
export async function openSSLKey(cryptoImpl: Crypto, password: string, salt: string): Promise<AESKeyParams> {
	var data = password + salt;
	var key = await cryptoImpl.md5Digest(data);
	var iv = await cryptoImpl.md5Digest(key + data);
	return new AESKeyParams(key, iv);
}

/** Encrypt the JSON data for an item for storage in the Agile Keychain format. */
export async function encryptAgileKeychainItemData(cryptoImpl: Crypto, key: string, plainText: string) {
	var salt = crypto.randomBytes(8);
	var keyParams = await openSSLKey(cryptoImpl, key, salt);
	return cryptoImpl.aesCbcEncrypt(keyParams.key, plainText, keyParams.iv).then(encrypted => {
		return 'Salted__' + salt + encrypted;
	});
}

/** Decrypt the encrypted contents of an item stored in the Agile Keychain format. */
export async function decryptAgileKeychainItemData(cryptoImpl: Crypto, key: string, cipherText: string) {
	var saltCipher = extractSaltAndCipherText(cipherText);
	var keyParams = await openSSLKey(cryptoImpl, key, saltCipher.salt);
	return cryptoImpl.aesCbcDecrypt(keyParams.key, saltCipher.cipherText, keyParams.iv);
}

/** Generate a V4 (random) UUID string in the form used
  * by items in an Agile Keychain:
  * - There are no hyphen separators between parts of the UUID
  * - All chars are upper case
  */
export function newUUID(): string {
	return uuid.v4().toUpperCase().replace(/-/g, '');
}

/**
  * Crypto is an interface to common crypto algorithms required to decrypt
  * Agile Keychain vaults.
  *
  * All string parameters and return values are binary strings.
  */
export interface Crypto {
	/**
	  * Decrypt @p cipherText using AES-CBC-128 with the given key and initialization vector.
	  *
	  * This *may* throw an exception if the key or initialization vector are incorrect.
	  */
	aesCbcDecrypt(key: string, cipherText: string, iv: string): Promise<string>;

	/**
	  * Encrypt `plainText` using AES-CBC-128 with the given key and initialization vector.
	  *
	  * This *may* throw an exception if the key or initialization vector are invalid.
	  */
	aesCbcEncrypt(key: string, plainText: string, iv: string): Promise<string>;

	/**
	  * Derive a key of length @p keyLen from a password using @p iterCount iterations
	  * of PBKDF2
	  */
	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number): Promise<string>;

	md5Digest(input: string): Promise<string>;
}

/** Crypto implementation using Node.js' crypto library. */
export class NodeCrypto implements Crypto {
	aesCbcDecrypt(key: string, cipherText: string, iv: string) {
		var keyBuf = new Buffer(key, 'binary');
		var ivBuf = new Buffer(iv, 'binary');
		var decipher = node_crypto.createDecipheriv('AES-128-CBC', keyBuf, ivBuf);
		let result = decipher.update(cipherText, 'binary', 'binary');
		result += decipher.final('binary');
		return Promise.resolve<string>(result);
	}

	aesCbcEncrypt(key: string, plainText: string, iv: string): Promise<string> {
		var keyBuf = new Buffer(key, 'binary');
		var ivBuf = new Buffer(iv, 'binary');
		var cipher = node_crypto.createCipheriv('AES-128-CBC', keyBuf, ivBuf);
		var result = '';
		result += cipher.update(plainText, 'binary', 'binary');
		result += cipher.final('binary');
		return Promise.resolve(result);
	}

	pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const saltBuf = new Buffer(salt, 'binary');
			node_crypto.pbkdf2(masterPwd, saltBuf, iterCount, keyLen, 'sha1', (err, derivedKey) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(derivedKey.toString('binary'));
			});
		});
	}

	async md5Digest(input: string): Promise<string> {
		var md5er = node_crypto.createHash('md5');
		md5er.update(bufferFromString(input));
		return md5er.digest('binary');
	}
}

interface WorkerAndRpc {
	worker: Worker;
	rpc: rpc.RpcHandler;
}

declare global {
	interface Crypto {
		// Prefixed implementation of SubtleCrypto in Safari
		// See https://blog.engelke.com/2015/03/02/apples-safari-browser-and-web-cryptography/
		webkitSubtle: SubtleCrypto;
	}
}

let subtleCrypto: SubtleCrypto;

if (typeof window !== 'undefined' && window.crypto) {
	subtleCrypto = window.crypto.subtle || window.crypto.webkitSubtle;
}

/**
  * Implements the Crypto interface using the Web Cryptography API
  * See https://www.w3.org/TR/WebCryptoAPI/
  */
class WebCrypto implements Crypto {
	private crypto: SubtleCrypto;

	constructor() {
		this.crypto = subtleCrypto;
	}

	async aesCbcDecrypt(key: string, cipherText: string, iv: string) {
		const cryptoKey = await this.crypto.importKey('raw', bufferFromString(key),
			'AES-CBC', false, ['decrypt']);
		const decrypted = await this.crypto.decrypt({name: 'AES-CBC', iv: bufferFromString(iv)},
			cryptoKey, bufferFromString(cipherText));
		return stringFromBuffer(new Uint8Array(decrypted));
	}

	async aesCbcEncrypt(key: string, plainText: string, iv: string) {
		const cryptoKey = await this.crypto.importKey('raw', bufferFromString(key),
			'AES-CBC', false, ['encrypt']);
		const encrypted = await this.crypto.encrypt({name: 'AES-CBC', iv: bufferFromString(iv)},
			cryptoKey, bufferFromString(plainText));
		return stringFromBuffer(new Uint8Array(encrypted));
	}

	async pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) {
		const masterKey = await this.crypto.importKey('raw', bufferFromString(masterPwd),
			'PBKDF2', false, ['deriveKey']);
		const derived = await this.crypto.deriveKey({
			name: 'PBKDF2',
			salt: bufferFromString(salt),
			iterations: iterCount,
			hash: 'SHA-1',
		}, masterKey, {name: 'AES-CBC', length: 256}, true /* extractable */, ['encrypt', 'decrypt']);
		const extracted = await this.crypto.exportKey('raw', derived);
		return stringFromBuffer(new Uint8Array(extracted));
	}

	async md5Digest(input: string) {
		// WebCrypto does not support MD5 :(
		return md5(encLatin1.parse(input)).toString(encLatin1);
	}
}

export var defaultCrypto: Crypto;

if (subtleCrypto) {
	defaultCrypto = new WebCrypto;
} else {
	defaultCrypto = new NodeCrypto;
}

