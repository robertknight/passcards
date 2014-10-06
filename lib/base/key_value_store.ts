/// <reference path="../../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../../typings/dom.d.ts" />

import assert = require('assert');
import Q = require('q');

import asyncutil = require('./asyncutil');
import collectionutil = require('./collectionutil');
import err_util = require('./err_util');
import stringutil = require('./stringutil');

export interface DatabaseSchemaModifier {
	createStore(name: string) : void;
	currentVersion(): number;
}

export interface Database {
	open(name: string, version: number, schemaUpdateCallback: (schemaUpdater: DatabaseSchemaModifier) => void) : Q.Promise<void>;
	store(name: string) : ObjectStore;
}

export interface ObjectStore {
	set<T>(key: string, value: T) : Q.Promise<void>;
	get<T>(key: string) : Q.Promise<T>;
	remove(key: string) : Q.Promise<void>;
	list(prefix?: string) : Q.Promise<string[]>;
}

export class IndexedDBDatabase implements Database {
	private database: Q.Promise<IDBDatabase>;
	private stores: Map<string,IndexedDBStore>;

	constructor() {
		this.database = Q.reject(new Error('Database not opened'));
		this.stores = new collectionutil.PMap<string,IndexedDBStore>();
	}

	open(name: string, version: number, schemaUpdateCallback: (schemaModifier: DatabaseSchemaModifier) => void) {
		// FIXME [Firefox] - When a DB is opened with a new Fx release,
		// then later we try to open the same DB with an older Fx release
		// which uses an earlier schema version for IDB databases the open
		// request may fail.
		//
		// In this case Firefox 31 prints a useful error message to the
		// Browser Console but does not return a useful error to the
		// onerror() handler below.

		var _db = Q.defer<IDBDatabase>();
		var req = indexedDB.open(name, version);
		req.onupgradeneeded = (e) => {
			var db = <IDBDatabase>req.result;
			schemaUpdateCallback({
				createStore: (name: string) => {
					db.createObjectStore(name);
				},
				currentVersion : () => {
					// [WORKAROUND / iOS 8.0 / Bug #136888] - the initial current
					// version reported for a new DB is a large positive value
					// (specifically, the result of Math.pow(2,63)) instead of 0 or undefined.
					//
					// Set old version to 0 if it appears to be invalid so that
					// correct schema upgrade steps are run.
					var MAX_SCHEMA_VERSION = Math.pow(2,50);
					var oldVersion = e.oldVersion || 0;
					if (oldVersion > MAX_SCHEMA_VERSION) {
						oldVersion = 0;
					}
					return oldVersion;
				}
			});
		};
		req.onsuccess = () => {
			var db = <IDBDatabase>(req.result);
			_db.resolve(db);
		};
		req.onerror = (e) => {
			var err = new err_util.BaseError('Failed to open IndexedDB database');
			err.sourceErr = e.error;
			_db.reject(err);
		};
		this.database = _db.promise;

		return asyncutil.eraseResult(this.database);
	}

	store(name: string) : ObjectStore {
		if (!this.stores.has(name)) {
			this.stores.set(name, new IndexedDBStore(this.database, name));
		}
		var store = this.stores.get(name);
		assert(store);
		return store;
	}
}

class IndexedDBStore implements ObjectStore {
	private db: Q.Promise<IDBDatabase>;

	constructor(database: Q.Promise<IDBDatabase>, public storeName: string) {
		this.db = database;
	}

	set<T>(key: string, value: T) : Q.Promise<void> {
		return this.db.then((db) => {
			var store = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
			return this.promisify<void>(store.put(value, key));
		});
	}

	get<T>(key: string) : Q.Promise<T> {
		return this.db.then((db) => {
			var store = db.transaction(this.storeName, 'readonly').objectStore(this.storeName);
			return this.promisify<T>(store.get(key));
		});
	}

	remove(key: string) : Q.Promise<void> {
		return this.db.then((db) => {
			var store = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
			return this.promisify<void>(store.delete(key));
		});
	}

	list(prefix: string = '') : Q.Promise<string[]> {
		return this.db.then((db) => {
			var store = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
			var req = store.openCursor(IDBKeyRange.lowerBound(prefix));
			var keys: string[] = [];
			var result = Q.defer<string[]>();

			req.onsuccess = () => {
				var cursor = <IDBCursor>req.result;
				if (!cursor || !stringutil.startsWith(cursor.key, prefix)) {
					result.resolve(keys);
					return;
				}
				keys.push(cursor.key);
				cursor.continue();
			};
			req.onerror = () => {
				result.reject(req.error);
			};

			return result.promise;
		});
	}

	private promisify<T>(req: IDBRequest) : Q.Promise<T> {
		var result = Q.defer<T>();
		req.onsuccess = () => {
			result.resolve(req.result);
		};
		req.onerror = () => {
			result.reject(req.error);
		};
		return result.promise;
	}
}

