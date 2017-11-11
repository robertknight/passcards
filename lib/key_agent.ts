// key_agent provides the KeyAgent interface for storing encryption keys
// and encrypting/decrypting data using the stored keys.

import assert = require('assert');

import { atob } from './base/stringutil';
import agile_keychain_crypto = require('./agile_keychain_crypto');
import crypto = require('./base/crypto');
import err_util = require('./base/err_util');
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
    AES128_OpenSSLKey,
}

export class CryptoParams {
    algo: CryptoAlgorithm;

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
    AgileKeychainKey,
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

export class DecryptionError extends err_util.BaseError {
    constructor(message: string) {
        super(message);
    }
}

/** Decrypt a set of keys using a password. */
export function decryptKeys(
    keys: Key[],
    password: string
): Promise<DecryptedKey[]> {
    let decryptedKeys: Promise<DecryptedKey>[] = [];
    keys.forEach(key => {
        assert.equal(key.format, KeyFormat.AgileKeychainKey);
        var saltCipher = agile_keychain_crypto.extractSaltAndCipherText(
            atob(key.data)
        );
        let decryptedKey = keyFromPassword(
            password,
            saltCipher.salt,
            key.iterations
        )
            .then(derivedKey => {
                return decryptKey(
                    derivedKey,
                    saltCipher.cipherText,
                    atob(key.validation)
                );
            })
            .then(decryptedKey => ({
                id: key.identifier,
                key: decryptedKey,
            }));
        decryptedKeys.push(decryptedKey);
    });
    return Promise.all(decryptedKeys);
}

/** Interface for agent which handles storage of decryption
 * keys and provides methods to encrypt and decrypt data
 * using the stored keys.
 */
export interface KeyAgent {
    /** Register a key with the agent for future use when decrypting items. */
    addKey(id: string, key: string): Promise<void>;
    /** Returns the IDs of stored keys. */
    listKeys(): Promise<string[]>;
    /** Clear all stored keys. */
    forgetKeys(): Promise<void>;
    /** Decrypt data for an item using the given key ID and crypto
     * parameters.
     *
     * Returns a promise for the decrypted plaintext.
     */
    decrypt(
        id: string,
        cipherText: string,
        params: CryptoParams
    ): Promise<string>;
    /** Encrypt data for an item using the given key ID and crypto
     * parameters.
     *
     * Returns a promise for the encrypted text.
     */
    encrypt(
        id: string,
        plainText: string,
        params: CryptoParams
    ): Promise<string>;

    /** Optional event stream which emits events when forgetKeys() is
     * called. Some key agents may not support this.
     */
    onLock?(): event_stream.EventStream<void>;

    /** Reset the timeout for auto-locking this key agent.
     * This should be called when the user interacts with the app
     * in some way to prevent auto-locking whilst the user is
     * interacting with the app.
     */
    resetAutoLock(): void;
}

/** A simple key agent which just stores keys in memory */
export class SimpleKeyAgent implements KeyAgent {
    private autoLockTimeout: number;
    private crypto: agile_keychain_crypto.Crypto;
    private keys: { [id: string]: string };
    private lockEvents: event_stream.EventStream<void>;

    // in Node, setTimeout() returns a Timer, in the browser
    // it returns a number
    private lockTimeout: any;

    keyCount(): number {
        return Object.keys(this.keys).length;
    }

    constructor(cryptoImpl?: agile_keychain_crypto.Crypto) {
        this.crypto = cryptoImpl || agile_keychain_crypto.defaultCrypto;
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

    addKey(id: string, key: string): Promise<void> {
        this.keys[id] = key;
        this.resetAutoLock();
        return Promise.resolve<void>(null);
    }

    listKeys(): Promise<string[]> {
        return Promise.resolve(Object.keys(this.keys));
    }

    forgetKeys(): Promise<void> {
        if (this.lockTimeout) {
            clearTimeout(this.lockTimeout);
            this.lockTimeout = null;
        }
        this.keys = {};
        this.lockEvents.publish(null);
        return Promise.resolve<void>(null);
    }

    decrypt(
        id: string,
        cipherText: string,
        params: CryptoParams
    ): Promise<string> {
        if (!this.keys.hasOwnProperty(id)) {
            return Promise.reject<string>(
                new DecryptionError('No such key: ' + id)
            );
        }
        switch (params.algo) {
            case CryptoAlgorithm.AES128_OpenSSLKey:
                return agile_keychain_crypto.decryptAgileKeychainItemData(
                    this.crypto,
                    this.keys[id],
                    cipherText
                );
            default:
                return Promise.reject<string>(
                    new Error('Unknown encryption algorithm')
                );
        }
    }

    encrypt(
        id: string,
        plainText: string,
        params: CryptoParams
    ): Promise<string> {
        if (!this.keys.hasOwnProperty(id)) {
            return Promise.reject<string>(new Error('No such key: ' + id));
        }
        switch (params.algo) {
            case CryptoAlgorithm.AES128_OpenSSLKey:
                return agile_keychain_crypto.encryptAgileKeychainItemData(
                    this.crypto,
                    this.keys[id],
                    plainText
                );
            default:
                return Promise.reject<string>(
                    new Error('Unknown encryption algorithm')
                );
        }
    }

    onLock(): event_stream.EventStream<void> {
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
export async function decryptKey(
    derivedKey: string,
    encryptedKey: string,
    validation: string
): Promise<string> {
    try {
        let aesKey = derivedKey.substring(0, 16);
        let iv = derivedKey.substring(16, 32);
        let decryptedKey = await agile_keychain_crypto.defaultCrypto.aesCbcDecrypt(
            aesKey,
            encryptedKey,
            iv
        );
        let validationSaltCipher = agile_keychain_crypto.extractSaltAndCipherText(
            validation
        );
        let keyParams = await agile_keychain_crypto.openSSLKey(
            agile_keychain_crypto.defaultCrypto,
            decryptedKey,
            validationSaltCipher.salt
        );

        let decryptedValidation = await agile_keychain_crypto.defaultCrypto.aesCbcDecrypt(
            keyParams.key,
            validationSaltCipher.cipherText,
            keyParams.iv
        );
        if (decryptedValidation !== decryptedKey) {
            throw new DecryptionError('Incorrect password');
        }
        return decryptedKey;
    } catch (err) {
        throw new DecryptionError('Incorrect password');
    }
}

/** Derive an encryption key from a password for use with decryptKey().
 * This version is synchronous and will block the UI if @p iterCount
 * is high.
 */
export async function keyFromPasswordSync(
    pass: string,
    salt: string,
    iterCount: number
) {
    return agile_keychain_crypto.defaultCrypto.pbkdf2(
        pass,
        salt,
        iterCount,
        AES_128_KEY_LEN
    );
}

/** Derive an encryption key from a password for use with decryptKey()
 * This version is asynchronous and will not block the UI.
 */
export function keyFromPassword(
    pass: string,
    salt: string,
    iterCount: number
): Promise<string> {
    return agile_keychain_crypto.defaultCrypto.pbkdf2(
        pass,
        salt,
        iterCount,
        AES_128_KEY_LEN
    );
}

/** Encrypt the master key for a vault.
 * @param derivedKey An encryption key for the master key, derived from a password using keyFromPassword()
 * @param decryptedKey The master key for the vault to be encrypted.
 */
export async function encryptKey(
    derivedKey: string,
    decryptedKey: string
): Promise<EncryptedKey> {
    let aesKey = derivedKey.substring(0, 16);
    let iv = derivedKey.substring(16, 32);
    let encryptedKey = agile_keychain_crypto.defaultCrypto.aesCbcEncrypt(
        aesKey,
        decryptedKey,
        iv
    );

    let validationSalt = crypto.randomBytes(8);
    let keyParams = await agile_keychain_crypto.openSSLKey(
        agile_keychain_crypto.defaultCrypto,
        decryptedKey,
        validationSalt
    );

    let validation = agile_keychain_crypto.defaultCrypto.aesCbcEncrypt(
        keyParams.key,
        decryptedKey,
        keyParams.iv
    );

    return Promise.all([encryptedKey, validation]).then(
        (result: [string, string]) => {
            let encryptedKey = result[0];
            let validation = 'Salted__' + validationSalt + result[1];
            return { key: encryptedKey, validation: validation };
        }
    );
}
