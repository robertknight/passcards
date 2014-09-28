// key_agent provides the KeyAgent interface for storing encryption keys
// and encrypting/decrypting data using the stored keys.

import Q = require('q');

import crypto = require('./onepass_crypto');
import event_stream = require('./base/event_stream');

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

