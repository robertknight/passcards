/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts"/>

import btoa = require('btoa');
import Q = require('q');

import agile_keychain_crypto = require('./agile_keychain_crypto');
import collectionutil = require('./base/collectionutil');
import crypto = require('./base/crypto');
import item_builder = require('./item_builder');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import key_value_store = require('./base/key_value_store');
import local_store = require('./local_store');
import stringutil = require('./base/stringutil');
import testLib = require('./test');

class FakeKeyValueDatabase implements key_value_store.Database {
	stores: Map<string, FakeKeyValueStore>;
	version: number;

	constructor() {
		this.reset();
	}

	open(name: string, version: number, schemaUpdateCallback: (schemaUpdater: key_value_store.DatabaseSchemaModifier) => void) {
		if (version > this.version) {
			schemaUpdateCallback({
				createStore: (name: string) => {
					if (!this.stores.get(name)) {
						this.stores.set(name, new FakeKeyValueStore);
					}
				},
				deleteStore: (name: string) => {
					this.stores.delete(name);
				},
				storeNames: () => {
					var keys: string[] = [];
					this.stores.forEach((_, k) => {
						keys.push(k);
					});
					return keys;
				},
				currentVersion: () => {
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

	delete() {
		if (this.version < 1) {
			return Q.reject<void>(new Error('Database is not open'));
		}
		this.reset();
		return Q<void>(null);
	}

	private reset() {
		this.stores = new collectionutil.PMap<string, FakeKeyValueStore>();
		this.version = 0;
	}
}

class FakeKeyValueStore implements key_value_store.ObjectStore {
	items: Map<string, any>;

	constructor() {
		this.items = new collectionutil.PMap<string, any>();
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

	iterate<T>(prefix: string, callback: (key: string, value?: T) => void) {
		this.items.forEach((value, key) => {
			if (stringutil.startsWith(key, prefix)) {
				callback(key, value);
			}
		});
		return Q<void>(null);
	}
}

interface Env {
	masterPass: string;
	masterKey: key_agent.Key;
	keyAgent: key_agent.SimpleKeyAgent;
	database: FakeKeyValueDatabase;
	databaseName: string;
}

function generateKey(password: string, iterations: number): key_agent.Key {
	var masterKey = crypto.randomBytes(1024);
	var salt = crypto.randomBytes(8);
	var derivedKey = key_agent.keyFromPasswordSync(password, salt, iterations);
	var encryptedKey = key_agent.encryptKey(derivedKey, masterKey);

	var key: key_agent.Key = {
		format: key_agent.KeyFormat.AgileKeychainKey,
		identifier: agile_keychain_crypto.newUUID(),
		data: btoa('Salted__' + salt + encryptedKey.key),
		iterations: iterations,
		validation: btoa(encryptedKey.validation)
	};
	return key;
}

function setupEnv(): Env {
	var keyAgent = new key_agent.SimpleKeyAgent();
	var database = new FakeKeyValueDatabase();

	var masterPass = 'testpass';
	var masterKey = generateKey(masterPass, 100);

	return {
		masterPass: masterPass,
		masterKey: masterKey,
		keyAgent: keyAgent,
		database: database,
		databaseName: 'test'
	};
}

testLib.addAsyncTest('save and load keys and hint', (assert) => {
	var env = setupEnv();

	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	var params: key_agent.CryptoParams = {
		algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey
	};
	var passHint = 'password hint';

	return store.saveKeys([env.masterKey], passHint).then(() => {
		return Q.all([store.listKeys(), store.passwordHint()]);
	}).then((keysAndHint) => {
		var keys = <key_agent.Key[]>keysAndHint[0];
		var hint = <string>keysAndHint[1];
		assert.equal(keys.length, 1);
		assert.equal(hint, passHint);
		return store.unlock(env.masterPass);
	}).then(() => {
		return env.keyAgent.encrypt(env.masterKey.identifier, 'testcontent', params);
	}).then((encrypted) => {
		return env.keyAgent.decrypt(env.masterKey.identifier, encrypted, params);
	}).then((plainText) => {
		assert.equal(plainText, 'testcontent');

		// reset the store and try unlocking again
		store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
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

function makeItem() {
	return new item_builder.Builder(item_store.ItemTypes.LOGIN)
	.setTitle('test item')
	.addLogin('foo.bar@gmail.com')
	.addPassword('pass3')
	.addUrl('acme.org')
	.addUrl('foo.acme.org')
	.item();
}

testLib.addAsyncTest('save and load items', (assert) => {
	var env = setupEnv();
	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	var item = makeItem();

	return store.saveKeys([env.masterKey], '').then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return item.saveTo(store);
	}).then(() => {
		return store.listItems();
	}).then((items) => {
		// FIXME testLib.assertEqual() uses xdiff.diff() which
		// has a bug that incorrectly reports a property
		// deletion if two objects have a key with
		// value undefined
		item.parentRevision = item.parentRevision || null;
		items[0].parentRevision = items[0].parentRevision || null;

		assert.equal(items.length, 1);
		testLib.assertEqual(assert, items[0], item, null, ['store', 'content', 'openContents']);
		return items[0].getContent();
	}).then((content) => {
		assert.deepEqual(content.urls, [{
			label: 'website', url: 'acme.org'
		}, {
				label: 'website', url: 'foo.acme.org'
			}]);
	});
});

testLib.addAsyncTest('save and load item revisions', (assert) => {
	var env = setupEnv();
	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	var item = makeItem();

	item.title = 'Initial Title';

	var firstRevision = '';
	var secondRevision = '';
	var thirdRevision = '';

	assert.equal(item.revision, null);
	return store.saveKeys([env.masterKey], '').then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return item.saveTo(store);
	}).then(() => {
		firstRevision = item.revision;
		assert.notEqual(item.revision, null);
		item.title = 'Updated Title';
		return item.saveTo(store);
	}).then(() => {
		assert.notEqual(item.revision, firstRevision);
		return store.loadItem(item.uuid, firstRevision);
	}).then(firstItemRevision => {
		assert.equal(firstItemRevision.item.parentRevision, null);
		assert.equal(firstItemRevision.item.revision, firstRevision);
		assert.equal(firstItemRevision.item.title, 'Initial Title');
		return store.loadItem(item.uuid, item.revision);
	}).then(secondItemRevision => {
		secondRevision = secondItemRevision.item.revision;
		assert.equal(secondItemRevision.item.parentRevision, firstRevision);
		assert.equal(secondItemRevision.item.revision, item.revision);
		assert.equal(secondItemRevision.item.title, 'Updated Title');

		item.trashed = true;
		return item.saveTo(store);
	}).then(() => {
		thirdRevision = item.revision;
		assert.equal(item.parentRevision, secondRevision);
		assert.notEqual(item.revision, secondRevision);
		return store.listItems();
	}).then(items => {
		assert.equal(items.length, 1);
		assert.equal(items[0].revision, thirdRevision);
		assert.equal(items[0].parentRevision, secondRevision);
	});
});

testLib.addAsyncTest('clear store', (assert) => {
	var env = setupEnv();
	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	var item = makeItem();

	return store.saveKeys([env.masterKey], '').then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return item.saveTo(store);
	}).then(() => {
		return store.listItems();
	}).then((items) => {
		assert.equal(items.length, 1);
		return store.clear();
	}).then(() => {
		return store.listItems();
	}).then((items) => {
		assert.equal(items.length, 0);
	});
});

testLib.addAsyncTest('unlock store with no keys', (assert) => {
	var env = setupEnv();
	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);

	return store.unlock(env.masterPass).then(() => {
		return false;
	}).catch((err) => {
		return err;
	}).then((result) => {
		assert.ok(result instanceof Error);
	});
});

testLib.addAsyncTest('get/set last sync data', (assert) => {
	var env = setupEnv();
	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	var item = makeItem();

	return store.saveKeys([env.masterKey], '').then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return store.lastSyncTimestamps();
	}).then((timestamps) => {
		assert.equal(timestamps.size, 0);
		return item.saveTo(store);
	}).then(() => {
		assert.notEqual(item.revision, null);
		return store.getLastSyncedRevision(item);
	}).then((revision) => {
		assert.equal(revision, null);
		return store.setLastSyncedRevision(item, item.revision);
	}).then(() => {
		return store.getLastSyncedRevision(item);
	}).then((revision) => {
		assert.equal(revision, item.revision);
		return store.lastSyncTimestamps();
	}).then((timestamps) => {
		assert.equal(timestamps.size, 1);
		assert.equal(timestamps.get(item.uuid).getTime(), item.updatedAt.getTime());
	});
});

testLib.addAsyncTest('item revision updates on save', (assert) => {
	var env = setupEnv();
	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	var item = makeItem();

	var revisions: string[] = [];

	// the item revision should change on each save and the parent
	// revision should be equal to the previous revision
	assert.equal(item.revision, null);
	return store.saveKeys([env.masterKey], '').then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return item.saveTo(store);
	}).then(() => {
		revisions.push(item.revision);
		assert.notEqual(item.revision, null);
		return item.saveTo(store);
	}).then(() => {
		revisions.push(item.revision);
		assert.notEqual(item.revision, revisions[0]);
		assert.equal(item.parentRevision, revisions[0]);
		return item.saveTo(store);
	}).then(() => {
		revisions.push(item.revision);
		assert.notEqual(item.revision, revisions[1]);
		assert.equal(item.parentRevision, revisions[1]);
	});
});

testLib.addAsyncTest('updating keys replaces existing keys', (assert) => {
	var env = setupEnv();
	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);

	env.masterKey.identifier = 'KEY1';
	return store.saveKeys([env.masterKey], '').then(() => {
		return store.listKeys();
	}).then((keys) => {
		assert.equal(keys.length, 1);
		env.masterKey.identifier = 'KEY2';
		return store.saveKeys([env.masterKey], '');
	}).then(() => {
		return store.listKeys();
	}).then((keys) => {
		assert.equal(keys.length, 1);
	});
});

