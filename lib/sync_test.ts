import testLib = require('./test');

import vfs_node = require('./vfs/node');
import item_builder = require('./item_builder');
import item_store = require('./item_store');
import sync = require('./sync');
import onepass = require('./onepass');

testLib.addAsyncTest('sync vault', (assert) => {
	var fs = new vfs_node.FileVFS('/tmp');
	var vault = new onepass.Vault(fs, '/tmp/sync-test-vault');
	var store = new item_store.TempStore();
	var syncer = new sync.Syncer(store, vault);
	
	// 1. save a new item to the vault
	var item = new item_builder.Builder(onepass.ItemType.Login)
	 .setTitle('sync me')
	 .addLogin('testuser@gmail.com')
	 .addUrl('accounts.google.com')
	 .item();
	
	return item.saveTo(vault).then(() => {
		// 2. sync and verify that the updated items were
		//    synced to the local store
		return syncer.sync();
	}).then((syncStats) => {
		assert.equal(syncStats.updated, 0);
		assert.equal(syncStats.total, 1);
		return store.listItems();
	}).then((storeItems) => {
		// 3. update the item in the vault, sync again
		//    and verify that the updates are synced
		//    to the local store
		assert.equal(storeItems.length, 1);
		assert.equal(storeItems[0].title, item.title);
		assert.equal(storeItems[0].location, item.location);
		return storeItems[0].getContent();
	}).then((content) => {
		// 3.1. Check that the encrypted content was synced
		//      successfully
		assert.deepEqual(content.formFields, [{
			name: 'username',
			type: onepass.FormFieldType.Text,
			designation: 'username',
			value: 'testuser@gmail.com'
		});

		item.title = 'sync me - updated';
		return item.save();
	}).then(() => {
		return syncer.sync();
	}).then((syncStats) => {
		assert.equal(syncStats.updated, 1);
		assert.equal(syncStats.total, 1);
		return store.listItems();
	}).then((storeItems) => {
		assert.equal(storeItems.length, 1);
		assert.equal(storeItems[0].title, item.title);
	});
});

// TODO: Tests for:
// - Syncing a locked vault
// - Syncing was sync() is already in progress
// - Syncing a larger vault with several hundred items
// - Syncing deleted items

testLib.start();
