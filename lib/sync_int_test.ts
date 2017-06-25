import agile_keychain = require('./agile_keychain');
import asyncutil = require('./base/asyncutil');
import item_builder = require('./item_builder');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import local_store = require('./local_store');
import key_value_store = require('./base/key_value_store');
import sync = require('./sync');
import testLib = require('./test');
import vfs_node = require('./vfs/node');
import vfs_util = require('./vfs/util');

// required by key_value_store.IndexedDBDatabase
(global as any).indexedDB = require('fake-indexeddb');
(global as any).IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

testLib.addTest('saves and syncs items', assert => {
    let db = new key_value_store.IndexedDBDatabase();
    let fs = new vfs_node.FileVFS(`${testLib.tempDir()}/sync-integration-test`);
    let keyAgent = new key_agent.SimpleKeyAgent();
    let agileKeychainStore: item_store.Store;
    let localStore = new local_store.Store(db, 'local', keyAgent);
    let syncer: sync.Syncer;

    let itemA = item_builder.createItem({
        title: 'Item A',
        username: 'usera',
        password: 'passa',
        url: 'domaina.com',
    });
    let itemB = item_builder.createItem({
        title: 'Item B',
        username: 'userb',
        password: 'passb',
        url: 'domainb.com',
    });

    const TEST_PASS = 'testpass';

    return vfs_util
        .mktemp(fs, '/', 'sync-integration-test-XXX.agilekeychain')
        .then(vaultPath => {
            return agile_keychain.Vault.createVault(
                fs,
                vaultPath,
                TEST_PASS,
                '',
                100,
                keyAgent
            );
        })
        .then(vault => {
            agileKeychainStore = vault;
            syncer = new sync.CloudStoreSyncer(localStore, agileKeychainStore);
            return syncer.syncKeys();
        })
        .then(() => {
            return localStore.unlock(TEST_PASS);
        })
        .then(() => {
            return asyncutil.all2([
                itemA.saveTo(localStore),
                itemB.saveTo(agileKeychainStore),
            ]);
        })
        .then(() => {
            return syncer.syncItems();
        })
        .then(syncResult => {
            // initial sync should sync item A from local -> cloud store,
            // item B from cloud -> local store
            assert.equal(syncResult.updated, 2);
            assert.equal(syncResult.total, 2);
            assert.equal(syncResult.failed, 0);

            return asyncutil.all2([
                localStore.listItemStates(),
                agileKeychainStore.listItemStates(),
            ]);
        })
        .then((result: [item_store.ItemState[], item_store.ItemState[]]) => {
            let [localItems, remoteItems] = result;
            assert.equal(localItems.length, 2);
            assert.equal(remoteItems.length, 2);

            // - subsequent sync should be a no-op
            // - Update different items in local & cloud stores, sync again
            // - Update same items in local & cloud stores, sync, result should
            //   be merged
            // - Delete item in local & cloud stores, sync, both vaults
            //   should be empty
        });
});
