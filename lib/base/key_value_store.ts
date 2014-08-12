/// <reference path="../../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../../typings/dom.d.ts" />

import Q = require('q');

import stringutil = require('./stringutil');

/** Interface for async key/value storage. */
export interface Store {
	set<T>(key: string, value: T) : Q.Promise<void>;
	get<T>(key: string) : Q.Promise<T>;
	remove(key: string) : Q.Promise<void>;
	list(prefix: string) : Q.Promise<string[]>;
}

/** Implementation of async key/value storage using IndexedDB */
export class IndexedDBStore implements Store {
	private db: Q.Promise<IDBDatabase>;

	constructor(public dbName: string, public storeName: string) {
		var DB_VERSION = 1;
		var _db = Q.defer<IDBDatabase>();

		// FIXME [Firefox] - When a DB is opened with a new Fx release,
		// then later we try to open the same DB with an older Fx release
		// which uses an earlier schema version for IDB databases the open
		// request may fail.
		//
		// In this case Firefox 31 prints a useful error message to the
		// Browser Console but does not return a useful error to the
		// onerror() handler below.

		var req = indexedDB.open(dbName, DB_VERSION);
		req.onupgradeneeded = () => {
			var db = <IDBDatabase>(req.result);
			db.createObjectStore(this.storeName);
		};
		req.onsuccess = () => {
			var db = <IDBDatabase>(req.result);
			_db.resolve(db);
		};
		req.onerror = (err) => {
			_db.reject(err);
		};

		this.db = _db.promise;
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

	list(prefix: string) : Q.Promise<string[]> {
		return this.db.then((db) => {
			var store = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
			var req = store.openCursor(IDBKeyRange.lowerBound(prefix));
			var keys: string[] = [];
			var result = Q.defer<string[]>();

			req.onsuccess = () => {
				var cursor = <IDBCursor>req.result;
				if (!stringutil.startsWith(cursor.key, prefix)) {
					result.resolve(keys);
				}
				keys.push(cursor.key);
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

