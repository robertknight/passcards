/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts"/>

import atob = require('atob');
import btoa = require('btoa');
import Q = require('q');
import underscore = require('underscore');

import collectionutil = require('./base/collectionutil');
import crypto = require('./onepass_crypto');
import key_agent = require('./key_agent');
import key_value_store = require('./base/key_value_store');
import local_store = require('./local_store');
import stringutil = require('./base/stringutil');
import testLib = require('./test');

class FakeKeyValueStore implements key_value_store.Store {
	private items: collectionutil.PMap<string,any>;

	constructor() {
		this.items = new collectionutil.PMap<string,any>();
	}

	set<T>(key: string, value: T) {
		this.items.set(key, value);
		return Q<void>(null);
	}

	get<T>(key: string) {
		return Q(<T>this.items.get(key));
	}

	remove(key: string) {
		this.items.delete(key);
		return Q<void>(null);
	}

	list(prefix: string) {
		var keys: string[] = [];
		this.items.forEach((value, key) => {
			if (stringutil.startsWith(key, prefix)) {
				keys.push(key);
			}
		});
		keys.sort();
		return Q(keys);
	}
}

function generateKey(password: string, iterations: number) : key_agent.Key {
	var masterKey = crypto.randomBytes(1024);
	var salt = crypto.randomBytes(8);
	var derivedKey = key_agent.keyFromPasswordSync(password, salt, iterations);
	var encryptedKey = key_agent.encryptKey(derivedKey, masterKey);

	var key: key_agent.Key = {
		format: key_agent.KeyFormat.AgileKeychainKey,
		identifier: crypto.newUUID(),
		data: btoa('Salted__' + salt + encryptedKey.key),
		iterations: iterations,
		validation: btoa(encryptedKey.validation)
	};
	return key;
}

testLib.addAsyncTest('save and load keys', (assert) => {
	var keyAgent = new key_agent.SimpleKeyAgent();

	var stores = new collectionutil.PMap<string, key_value_store.Store>();
	var kvStoreFactory = (name: string) => {
		var store = stores.get(name);
		if (!store) {
			store = new FakeKeyValueStore();
			stores.set(name, store);
		}
		return store;
	};

	var masterKey = generateKey('testpass', 100);
	var store = new local_store.Store(kvStoreFactory, keyAgent);
	var params: key_agent.CryptoParams = {
		algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey
	};

	return store.saveKeys([masterKey]).then(() => {
		return store.listKeys();
	}).then((keys) => {
		assert.equal(keys.length, 1);
		return store.unlock('testpass');
	}).then(() => {
		return keyAgent.encrypt(masterKey.identifier, 'testcontent', params);
	}).then((encrypted) => {
		return keyAgent.decrypt(masterKey.identifier, encrypted, params);
	}).then((plainText) => {
		assert.equal(plainText, 'testcontent');

		// reset the store and try unlocking again
		store = new local_store.Store(kvStoreFactory, keyAgent);
		return keyAgent.forgetKeys();
	}).then(() => {
		return store.unlock('testpass');
	}).then(() => {
		return keyAgent.encrypt(masterKey.identifier, 'testcontent2', params);
	}).then((encrypted) => {
		return keyAgent.decrypt(masterKey.identifier, encrypted, params);
	}).then((plainText) => {
		assert.equal(plainText, 'testcontent2');
	});
})

testLib.start();

