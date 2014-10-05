/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts"/>

import atob = require('atob');
import btoa = require('btoa');
import Q = require('q');
import underscore = require('underscore');

import collectionutil = require('./base/collectionutil');
import crypto = require('./onepass_crypto');
import item_builder = require('./item_builder');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import key_value_store = require('./base/key_value_store');
import local_store = require('./local_store');
import stringutil = require('./base/stringutil');
import testLib = require('./test');

class FakeKeyValueDatabase implements key_value_store.Database {
	stores: Map<string,FakeKeyValueStore>;
	version: number;

	constructor() {
		this.stores = new collectionutil.PMap<string,FakeKeyValueStore>();
		this.version = 0;
	}

	open(name: string, version: number, schemaUpdateCallback: (schemaUpdater: key_value_store.DatabaseSchemaModifier) => void) {
		if (version > this.version) {
			schemaUpdateCallback({
				createStore : (name: string) => {
					if (!this.stores.get(name)) {
						this.stores.set(name, new FakeKeyValueStore);
					}
				},
				currentVersion : () => {
					return this.version;
				}
			});
			this.version = version;
		}
		return Q<void>(null);
	}

	store(name: string) {
		if (!this.stores.get(name)) {
			this.stores.set(name, new FakeKeyValueStore);
		}
		return this.stores.get(name);
	}
}

class FakeKeyValueStore implements key_value_store.ObjectStore {
	items: Map<string,any>;

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

	list(prefix: string = '') {
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

interface Env {
	masterPass: string;
	masterKey: key_agent.Key;
	keyAgent: key_agent.SimpleKeyAgent;
	database: FakeKeyValueDatabase;
}

// TODO - Move to onepass_crypto
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

function setupEnv() : Env {
	var keyAgent = new key_agent.SimpleKeyAgent();
	var database = new FakeKeyValueDatabase();

	var masterPass = 'testpass';
	var masterKey = generateKey(masterPass, 100);

	return {
		masterPass: masterPass,
		masterKey: masterKey,
		keyAgent: keyAgent,
		database: database
	};
}

testLib.addAsyncTest('save and load keys', (assert) => {
	var env = setupEnv();

	var store = new local_store.Store(env.database, env.keyAgent);
	var params: key_agent.CryptoParams = {
		algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey
	};

	return store.saveKeys([env.masterKey]).then(() => {
		return store.listKeys();
	}).then((keys) => {
		assert.equal(keys.length, 1);
		return store.unlock(env.masterPass);
	}).then(() => {
		return env.keyAgent.encrypt(env.masterKey.identifier, 'testcontent', params);
	}).then((encrypted) => {
		return env.keyAgent.decrypt(env.masterKey.identifier, encrypted, params);
	}).then((plainText) => {
		assert.equal(plainText, 'testcontent');

		// reset the store and try unlocking again
		store = new local_store.Store(env.database, env.keyAgent);
		return env.keyAgent.forgetKeys();
	}).then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return env.keyAgent.encrypt(env.masterKey.identifier, 'testcontent2', params);
	}).then((encrypted) => {
		return env.keyAgent.decrypt(env.masterKey.identifier, encrypted, params);
	}).then((plainText) => {
		assert.equal(plainText, 'testcontent2');
	});
});

testLib.addAsyncTest('save and load items', (assert) => {
	var env = setupEnv();
	var store = new local_store.Store(env.database, env.keyAgent);
	var params = { algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey };

	var item = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	 .setTitle('test item')
	 .addLogin('foo.bar@gmail.com')
	 .addPassword('pass3')
	 .addUrl('acme.org')
	 .addUrl('foo.acme.org')
	 .item();

	return store.saveKeys([env.masterKey]).then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return item.saveTo(store);
	}).then(() => {
		return store.listItems();
	}).then((items) => {
		assert.equal(items.length, 1);
		testLib.assertEqual(assert, items[0], item, null, ['store', 'content', 'openContents']);
		return items[0].getContent();
	}).then((content) => {
		assert.deepEqual(content.urls, [{
			label: 'website', url: 'acme.org'
		},{
			label: 'website', url: 'foo.acme.org'
		}]);
	});
});

testLib.start();

