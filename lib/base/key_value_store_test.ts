import assert = require('assert');

import key_value_store = require('./key_value_store');
import testLib = require('../test');

global.indexedDB = require('fake-indexeddb');
global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

function setupDB(name: string) {
	let db = new key_value_store.IndexedDBDatabase();
	const TEST_STORE_NAME = 'test-store';

	return db.open(name, 1, schemaUpdater => {
		schemaUpdater.createStore(TEST_STORE_NAME);
		assert.deepEqual(schemaUpdater.storeNames(), [TEST_STORE_NAME]);
	}).then(() => db.store(TEST_STORE_NAME));
}

testLib.addTest('iterate over keys and values', assert => {
	let values: [string, number][] = [];
	let expectedValues = values;
	let store: key_value_store.ObjectStore;
	return setupDB('test-iterate').then(store_ => {
		store = store_;
		for (let i = 1; i <= 3; i++) {
			expectedValues.push([i.toString(), i]);
		}
		return key_value_store.setItems(store, expectedValues);
	}).then(() => {
		return store.iterate<number>('', (key, value) => {
			values.push([key, value]);
		});
	}).then(() => {
		assert.deepEqual(values, expectedValues);
	});
});

testLib.addTest('list keys', assert => {
	let store: key_value_store.ObjectStore;
	return setupDB('test-list').then(store_ => {
		store = store_;
		return key_value_store.setItems(store, [
			['a', 1],
			['b', 2],
			['c', 3]
		]);
	}).then(() => {
		return key_value_store.listKeys(store);
	}).then(keys => {
		assert.deepEqual(keys, ['a', 'b', 'c']);
	});
});

