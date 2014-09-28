/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

// key_agent provides the KeyAgent interface for storing encryption keys
// and encrypting/decrypting data using the stored keys.

import atob = require('atob');
import assert = require('assert');
import Q = require('q');

import asyncutil = require('./base/asyncutil');
import crypto = require('./onepass_crypto');
import event_stream = require('./base/event_stream');

var AES_128_KEY_LEN = 32; // 16 byte key + 16 byte IV

/** Specifies supported algorithms that key agents can use
  * to encrypt/decrypt data.
  */
export enum CryptoAlgorithm {
	/** The algorithm used in the Agile Keychain format to encrypt item
	  * data.
	  *
	  * Data is encrypted using AES-128 with a random salt and encryption key/IV derived
	  * using onepass_crypto.openSSLKey().
	  * See onepass_crypto.encryptAgileKeychainItemData()
	  */
	AES128_OpenSSLKey
}

export class CryptoParams {
	algo : CryptoAlgorithm;

	constructor(algo: CryptoAlgorithm) {
		this.algo = algo;
	}
}

export enum KeyFormat {
	/** Encryption key format used in the 1Password Agile Keychain format.
	  *
	  * Keys in this format are encrypted using AES-CBC-128 using a key
	  * derived from a master password using PBKDF2.
	  */
	AgileKeychainKey
}

export interface Key {
	/** Format of the encrypted key. This specifies the
	  * storage format of the encrypted key, the algorithm used
	  * for password derivation.
	  */
	format: KeyFormat;

	/** Unique ID for this encryption key */
	identifier: string;

	/** Encrypted key */
	data: string;

	/** Number of iterations of the password stretching function used
	  * for this key.
	  */
	iterations: number;

	/** Data used to validate an encrypted key. */
	validation: string;
}

export interface EncryptedKey {
	/** The master key for the vault, encrypted with a key derived from the user's
	  * master password.
	  */
	key: string;

	/** A copy of the master key encrypted with itself. This can be used to verify
	  * successful decryption of the key when it is next decrypted.
	  */
	validation: string;
}

export interface DecryptedKey {
	id: string;
	key: string;
}

export class DecryptionError {
	context : string;

	constructor(context?: string) {
		this.context = context;
	}

	toString() : string {
		return this.context || 'Decryption failed';
	}
}

/** Decrypt a set of keys using a password. */
export function decryptKeys(keys: Key[], password: string) : Q.Promise<DecryptedKey[]> {
	var derivedKeys : Q.Promise<string>[] = [];
	keys.forEach((key) => {
		assert.equal(key.format, KeyFormat.AgileKeychainKey);
		var saltCipher = crypto.extractSaltAndCipherText(atob(key.data));
		derivedKeys.push(keyFromPassword(password, saltCipher.salt, key.iterations));
	});

	return Q.all(derivedKeys).then((derivedKeys) => {
		var decryptedKeys: DecryptedKey[] = [];
		keys.forEach((key, index) => {
			var saltCipher = crypto.extractSaltAndCipherText(atob(key.data));
			var decryptedKey = decryptKey(derivedKeys[index], saltCipher.cipherText,
				atob(key.validation));
			decryptedKeys.push({
				id: key.identifier,
				key: decryptedKey
			});
		});
		return decryptedKeys;
	});
}

/** Interface for agent which handles storage of decryption
  * keys and provides methods to encrypt and decrypt data
  * using the stored keys.
  */
export interface KeyAgent {
	/** Register a key with the agent for future use when decrypting items. */
	addKey(id: string, key: string) : Q.Promise<void>;
	/** Returns the IDs of stored keys. */
	listKeys() : Q.Promise<string[]>;
	/** Clear all stored keys. */
	forgetKeys() : Q.Promise<void>;
	/** Decrypt data for an item using the given key ID and crypto
	  * parameters.
	  *
	  * Returns a promise for the decrypted plaintext.
	  */
	decrypt(id: string, cipherText: string, params: CryptoParams) : Q.Promise<string>;
	/** Encrypt data for an item using the given key ID and crypto
	  * parameters.
	  *
	  * Returns a promise for the encrypted text.
	  */
	encrypt(id: string, plainText: string, params: CryptoParams) : Q.Promise<string>;
}

/** A simple key agent which just stores keys in memory */
export class SimpleKeyAgent {
	private autoLockTimeout: number;
	private crypto: crypto.Crypto;
	private keys: {[id:string] : string};
	private lockEvents: event_stream.EventStream<void>;
	private lockTimeout: number;

	keyCount() : number {
		return Object.keys(this.keys).length;
	}

	constructor(cryptoImpl? : crypto.Crypto) {
		this.crypto = cryptoImpl || crypto.defaultCrypto;
		this.keys = {};
		this.lockEvents = new event_stream.EventStream<void>();
		this.autoLockTimeout = 0;
	}
	
	/** Reset the auto-lock timer. */
	public resetAutoLock() {
		if (!this.autoLockTimeout) {
			return;
		}
		if (this.lockTimeout) {
			clearTimeout(this.lockTimeout);
			this.lockTimeout = null;
		}
		this.lockTimeout = setTimeout(() => {
			this.forgetKeys();
		}, this.autoLockTimeout);
	}

	/** Set a timeout after which the agent will automatically discard
	  * its keys, thereby locking the vault.
	  *
	  * If timeout is zero or null, auto-lock is disabled.
	  * Auto-lock is disabled by default in SimpleKeyAgent
	  */
	setAutoLockTimeout(timeout: number) {
		this.autoLockTimeout = timeout;
		if (this.lockTimeout) {
			this.resetAutoLock();
		}
	}

	addKey(id: string, key: string) : Q.Promise<void> {
		this.keys[id] = key;
		this.resetAutoLock();
		return Q<void>(null);
	}

	listKeys() : Q.Promise<string[]> {
		return Q(Object.keys(this.keys));
	}

	forgetKeys() : Q.Promise<void> {
		if (this.lockTimeout) {
			clearTimeout(this.lockTimeout);
			this.lockTimeout = null;
		}
		this.keys = {};
		this.lockEvents.publish(null);
		return Q<void>(null);
	}

	decrypt(id: string, cipherText: string, params: CryptoParams) : Q.Promise<string> {
		if (!this.keys.hasOwnProperty(id)) {
			return Q.reject('No such key: ' + id);
		}
		switch (params.algo) {
			case CryptoAlgorithm.AES128_OpenSSLKey:
				return Q(crypto.decryptAgileKeychainItemData(this.crypto,
					  this.keys[id], cipherText));
			default:
				return Q.reject('Unknown encryption algorithm');
		}
	}

	encrypt(id: string, plainText: string, params: CryptoParams) : Q.Promise<string> {
		if (!this.keys.hasOwnProperty(id)) {
			return Q.reject('No such key: ' + id);
		}
		switch (params.algo) {
			case CryptoAlgorithm.AES128_OpenSSLKey:
				return Q(crypto.encryptAgileKeychainItemData(this.crypto,
					this.keys[id], plainText));
			default:
				return Q.reject('Unknown encryption algorithm');
		}
	}

	onLock() : event_stream.EventStream<void> {
		return this.lockEvents;
	}
}

/** Decrypt the master key for a vault.
  *
  * @param derivedKey The encryption key that was used to encrypt @p encryptedKey, this is
  *   derived from a password using keyFromPassword()
  * @param encryptedKey The encryption key, encrypted with @p derivedKey
  * @param validation Validation data used to verify whether decryption was successful.
  *  This is a copy of the decrypted version of @p encryptedKey, encrypted with itself.
  */
export function decryptKey(derivedKey: string, encryptedKey: string, validation: string) : string {
	var aesKey = derivedKey.substring(0, 16);
	var iv = derivedKey.substring(16, 32);
	var decryptedKey = crypto.defaultCrypto.aesCbcDecrypt(aesKey, encryptedKey, iv);
	var validationSaltCipher = crypto.extractSaltAndCipherText(validation);

	var keyParams = crypto.openSSLKey(crypto.defaultCrypto, decryptedKey, validationSaltCipher.salt);
	var decryptedValidation = crypto.defaultCrypto.aesCbcDecrypt(keyParams.key, validationSaltCipher.cipherText, keyParams.iv);

	if (decryptedValidation != decryptedKey) {
		throw new DecryptionError('Incorrect password');
	}

	return decryptedKey;
}

/** Derive an encryption key from a password for use with decryptKey().
  * This version is synchronous and will block the UI if @p iterCount
  * is high.
  */
export function keyFromPasswordSync(pass: string, salt: string, iterCount: number) : string {
	return crypto.defaultCrypto.pbkdf2Sync(pass, salt, iterCount, AES_128_KEY_LEN);
}

/** Derive an encryption key from a password for use with decryptKey()
  * This version is asynchronous and will not block the UI.
  */
export function keyFromPassword(pass: string, salt: string, iterCount: number) : Q.Promise<string> {
	return crypto.defaultCrypto.pbkdf2(pass, salt, iterCount, AES_128_KEY_LEN);
}

/** Encrypt the master key for a vault.
  * @param derivedKey An encryption key for the master key, derived from a password using keyFromPassword()
  * @param decryptedKey The master key for the vault to be encrypted.
  */
export function encryptKey(derivedKey: string, decryptedKey: string) : EncryptedKey {
	var aesKey = derivedKey.substring(0, 16);
	var iv = derivedKey.substring(16, 32);
	var encryptedKey = crypto.defaultCrypto.aesCbcEncrypt(aesKey, decryptedKey, iv);

	var validationSalt = crypto.randomBytes(8);
	var keyParams = crypto.openSSLKey(crypto.defaultCrypto, decryptedKey, validationSalt);
	var validation = 'Salted__' + validationSalt + crypto.defaultCrypto.aesCbcEncrypt(keyParams.key, decryptedKey, keyParams.iv);

	return {key: encryptedKey, validation: validation};
}
