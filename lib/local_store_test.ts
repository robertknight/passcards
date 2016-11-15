
import { btoa } from './base/stringutil';
import asyncutil = require('./base/asyncutil');
import agile_keychain_crypto = require('./agile_keychain_crypto');
import crypto = require('./base/crypto');
import item_builder = require('./item_builder');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import mem_key_value_store = require('./base/mem_key_value_store');
import local_store = require('./local_store');
import testLib = require('./test');

interface Env {
	masterPass: string;
	masterKey: key_agent.Key;
	keyAgent: key_agent.SimpleKeyAgent;
	database: mem_key_value_store.Database;
	databaseName: string;
}

function generateKey(password: string, iterations: number): Promise<key_agent.Key> {
	let masterKey = crypto.randomBytes(1024);
	let salt = crypto.randomBytes(8);
	let derivedKey = key_agent.keyFromPassword(password, salt, iterations);

	return derivedKey.then(derivedKey => {
		return key_agent.encryptKey(derivedKey, masterKey);
	}).then(encryptedKey => {
		return {
			format: key_agent.KeyFormat.AgileKeychainKey,
			identifier: agile_keychain_crypto.newUUID(),
			data: btoa('Salted__' + salt + encryptedKey.key),
			iterations: iterations,
			validation: btoa(encryptedKey.validation)
		};
	});
}

let masterPass = 'testpass';
let masterKey: key_agent.Key;

function setupEnv(): Env {
	let keyAgent = new key_agent.SimpleKeyAgent();
	let database = new mem_key_value_store.Database();
	let masterPass = 'testpass';

	return {
		masterPass: masterPass,
		masterKey: masterKey,
		keyAgent: keyAgent,
		database: database,
		databaseName: 'test'
	};
}

function setupStoreAndUnlock() {
	let env = setupEnv();

	let store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	return store.saveKeys([env.masterKey], 'hint').then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return store;
	})
}

testLib.addTest('save and load keys and hint', (assert) => {
	var env = setupEnv();

	var store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	var params: key_agent.CryptoParams = {
		algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey
	};
	var passHint = 'password hint';

	return store.saveKeys([env.masterKey], passHint).then(() => {
		return asyncutil.all2([store.listKeys(), store.passwordHint()]);
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

testLib.addTest('save and load items', (assert) => {
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

testLib.addTest('save and load item revisions', (assert) => {
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

testLib.addTest('clear store', (assert) => {
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

testLib.addTest('unlock store with no keys', (assert) => {
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

testLib.addTest('get/set last sync data', assert => {
	let store: local_store.Store;
	let item = makeItem();

	const CLOUD_STORE_ID = 'cloud';

	return setupStoreAndUnlock().then(store_ => {
		store = store_;
	}).then(() => {
		return store.lastSyncRevisions(CLOUD_STORE_ID);
	}).then(revisions => {
		assert.equal(revisions.size, 0);
		return item.saveTo(store);
	}).then(() => {
		assert.notEqual(item.revision, null);
		return store.getLastSyncedRevision(item.uuid, CLOUD_STORE_ID);
	}).then(revision => {
		assert.equal(revision, null);
		return store.setLastSyncedRevision(item, CLOUD_STORE_ID, {
			local: item.revision,
			external: '1'
		});
	}).then(() => {
		return store.getLastSyncedRevision(item.uuid, CLOUD_STORE_ID);
	}).then(revision => {
		assert.equal(revision.local, item.revision);
		assert.equal(revision.external, '1');
		return store.lastSyncRevisions(CLOUD_STORE_ID);
	}).then(revisions => {
		assert.equal(revisions.size, 1);
		assert.equal(revisions.get(item.uuid).local, item.revision);
	});
});

testLib.addTest('item revision updates on save', (assert) => {
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

testLib.addTest('updating keys replaces existing keys', (assert) => {
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

interface StoreWithItem {
	store: item_store.Store;
	item: item_store.Item;
}

function createStoreWithItem() {
	let env = setupEnv();
	let store = new local_store.Store(env.database, env.databaseName, env.keyAgent);
	let item = makeItem();

	return store.saveKeys([env.masterKey], '').then(() => {
		return store.unlock(env.masterPass);
	}).then(() => {
		return item.saveTo(store);
	}).then(() => ({
		store: store,
		item: item
	}));
}

testLib.addTest('list item states', assert => {
	var storeAndItem: StoreWithItem;
	return createStoreWithItem().then(storeAndItem_ => {
		storeAndItem = storeAndItem_;
		return storeAndItem.store.listItemStates();
	}).then(items => {
		assert.deepEqual(items, [{
			uuid: storeAndItem.item.uuid,
			revision: storeAndItem.item.revision,
			deleted: false
		}]);
	});
});

testLib.cancelAutoStart();
generateKey(masterPass, 100).then(key => {
	masterKey = key;
	testLib.start();
});
