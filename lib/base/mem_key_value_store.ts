import key_value_store = require('./key_value_store');
import stringutil = require('./stringutil');

export class Database implements key_value_store.Database {
	stores: Map<string, ObjectStore>;
	version: number;

	constructor() {
		this.reset();
	}

	open(name: string, version: number, schemaUpdateCallback: (schemaUpdater: key_value_store.DatabaseSchemaModifier) => void) {
		if (version > this.version) {
			schemaUpdateCallback({
				createStore: (name: string) => {
					if (!this.stores.get(name)) {
						this.stores.set(name, new ObjectStore);
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
		return Promise.resolve<void>(null);
	}

	store(name: string) {
		if (!this.stores.get(name)) {
			this.stores.set(name, new ObjectStore);
		}
		return this.stores.get(name);
	}

	delete() {
		if (this.version < 1) {
			return Promise.reject<void>(new Error('Database is not open'));
		}
		this.reset();
		return Promise.resolve<void>(null);
	}

	private reset() {
		this.stores = new Map<string, ObjectStore>();
		this.version = 0;
	}
}

class ObjectStore implements key_value_store.ObjectStore {
	items: Map<string, any>;

	constructor() {
		this.items = new Map<string, any>();
	}

	set<T>(key: string, value: T) {
		this.items.set(key, value);
		return Promise.resolve<void>(null);
	}

	get<T>(key: string) {
		return Promise.resolve(<T>this.items.get(key));
	}

	remove(key: string) {
		this.items.delete(key);
		return Promise.resolve<void>(null);
	}

	iterate<T>(prefix: string, callback: (key: string, value?: T) => void) {
		this.items.forEach((value, key) => {
			if (stringutil.startsWith(key, prefix)) {
				callback(key, value);
			}
		});
		return Promise.resolve<void>(null);
	}
}
