/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import Q = require('q');
import underscore = require('underscore');

import asyncutil = require('./base/asyncutil');
import item_builder = require('./item_builder');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import onepass = require('./onepass');
import sync = require('./sync');
import testLib = require('./test');
import vfs_node = require('./vfs/node');

interface Env {
	store: item_store.TempStore;
	syncer: sync.Syncer;
	vault: onepass.Vault;
}

function setup() : Q.Promise<Env> {
	var VAULT_PASS = 'testpass';
	var VAULT_PASS_ITERATIONS = 100;

	var fs = new vfs_node.FileVFS('/tmp');
	var vault: onepass.Vault;

	return onepass.Vault.createVault(fs, '/tmp/sync-test-vault',
	  VAULT_PASS, 'testhint', VAULT_PASS_ITERATIONS).then((_vault) => {
		vault = _vault;
		return vault.unlock(VAULT_PASS);
	}).then(() => {
		var store = new item_store.TempStore(new key_agent.SimpleKeyAgent());
		var syncer = new sync.Syncer(store, vault);

		return {
			store: store,
	  		syncer: syncer,
			vault: vault
		};
	});
}

// create a vault, a local store and a syncer.
// Add a single item to the vault and the vault, local store, syncer and
// a reference to the item in the vault
function setupWithItem() : Q.Promise<{env: Env; item: item_store.Item}> {
	var env: Env;

	var item = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	 .setTitle('sync me')
	 .addLogin('jim@acme.org')
	 .addUrl('acme.org')
	 .item();

	return setup().then((_env) => {
		env = _env;
		return item.saveTo(env.vault);
	}).then(() => {
		return {
			env: env,
			item: item
		}
	});
}

testLib.addAsyncTest('sync vault', (assert) => {
	var env: Env;

	// 1. save a new item to the vault
	var item = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	 .setTitle('sync me')
	 .addLogin('testuser@gmail.com')
	 .addUrl('accounts.google.com')
	 .item();

	return setup().then((_env) => {
		env = _env;
		return item.saveTo(env.vault);
	}).then(() => {
		// 2. sync and verify that the updated items were
		//    synced to the local store
		return env.syncer.syncItems();
	}).then((syncStats) => {
		assert.equal(syncStats.updated, 1);
		assert.equal(syncStats.total, 1);
		return env.store.listItems();
	}).then((storeItems) => {
		// 3. update the item in the vault, sync again
		//    and verify that the updates are synced
		//    to the local store
		assert.equal(storeItems.length, 1);
		assert.equal(storeItems[0].title, item.title);
		assert.deepEqual(storeItems[0].locations, item.locations);
		return storeItems[0].getContent();
	}).then((content) => {
		// 3.1. Check that the encrypted content was synced
		//      successfully
		testLib.assertEqual(assert, content.formFields, [{
			id: '',
			name: 'username',
			type: item_store.FormFieldType.Text,
			designation: 'username',
			value: 'testuser@gmail.com'
		}]);

		item.title = 'sync me - updated';
		return item.save();
	}).then(() => {
		return env.syncer.syncItems();
	}).then((syncStats) => {
		assert.equal(syncStats.updated, 1);
		assert.equal(syncStats.total, 1);
		return env.store.listItems();
	}).then((storeItems) => {
		assert.equal(storeItems.length, 1);
		assert.equal(storeItems[0].title, item.title);
	});
});

testLib.addAsyncTest('sync progress', (assert) => {
	var env: Env;

	var item = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	 .setTitle('sync me')
	 .addLogin('testuser@gmail.com')
	 .addUrl('accounts.google.com')
	 .item();

	var progressUpdates: sync.SyncProgress[] = [];

	return setup().then((_env) => {
		env = _env;
		env.syncer.onProgress.listen((progress) => {
			progressUpdates.push(underscore.clone(progress));
		});
		return item.saveTo(env.vault);
	}).then(() => {
		return env.syncer.syncItems();
	}).then((finalState) => {
		assert.deepEqual(progressUpdates, [{
			state: sync.SyncState.ListingItems,
			updated: 0,
			total: 0
		},{
			state: sync.SyncState.SyncingItems,
			updated: 0,
			total: 1
		},{
			state: sync.SyncState.SyncingItems,
			updated: 1,
			total: 1
		},{
			state: sync.SyncState.Idle,
			updated: 1,
			total: 1
		}], 'check that expected progress updates were received');

		assert.deepEqual(finalState, {
			state: sync.SyncState.Idle,
			updated: 1,
			total: 1
		});

		progressUpdates = [];
		return env.syncer.syncItems();
	}).then(() => {
		assert.deepEqual(progressUpdates, [{
			state: sync.SyncState.ListingItems,
			updated: 0,
			total: 0
		},{
			state: sync.SyncState.SyncingItems,
			updated: 0,
			total: 0
		},{
			state: sync.SyncState.Idle,
			updated: 0,
			total: 0
		}]);
	});
});

testLib.addAsyncTest('sync deleted items', (assert) => {
	var env: Env;
	var item: item_store.Item;

	return setupWithItem().then((_env) => {
		env = _env.env;
		item = _env.item;

		// sync item to local store
		return env.syncer.syncItems();
	}).then(() => {

		// remove it in the vault
		return item.remove(); 
	}).then(() => {

		// sync again
		return env.syncer.syncItems();
	}).then(() => {
		return env.store.listItems({includeTombstones: true});
	}).then((items) => {

		// verify that the store item was also
		// deleted
		assert.equal(items.length, 1);
		assert.ok(items[0].isTombstone());
	});
});

testLib.addAsyncTest('sync locked vault', (assert) => {
	var env: Env;
	var item: item_store.Item;

	setupWithItem().then((_env) => {
		env = _env.env;
		item = _env.item;

		return env.vault.lock()
	}).then(() => {
		return env.syncer.syncItems();
	}).catch((err) => {
		assert.ok(err.message.indexOf('No such key') != -1);
		testLib.continueTests();
	});
});

testLib.addAsyncTest('repeat sync', (assert) => {
	return setupWithItem().then((env) => {
		// syncing whilst a sync is already in progress should return
		// the same promise
		var synced = env.env.syncer.syncItems();
		var synced2 = env.env.syncer.syncItems();
		assert.equal(synced, synced2);
		return synced2;
	});
});

testLib.addAsyncTest('sync many items', (assert) => {
	var ITEM_COUNT = 100;
	var env: Env;

	return setup().then((_env) => {
		env = _env;

		var saves: Q.Promise<void>[] = [];
		while (saves.length < ITEM_COUNT) {
			var item = new item_builder.Builder(item_store.ItemTypes.LOGIN)
			 .setTitle('sync me ' + saves.length)
			 .addLogin('testuser' + saves.length + '@gmail.com')
		  	 .addUrl('signon.acme.org')
			 .item();
			saves.push(item.saveTo(env.vault));
		}

		return Q.all(saves);
	}).then(() => {
		return env.syncer.syncItems();
	}).then(() => {
		return env.store.listItems();
	}).then((items) => {
		assert.equal(items.length, ITEM_COUNT, 'synced expected number of items');
	});
});

testLib.start();
