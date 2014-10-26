/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');
import underscore = require('underscore');

import asyncutil = require('./base/asyncutil');
import collectionutil = require('./base/collectionutil');
import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import key_value_store = require('./base/key_value_store');
import onepass_crypto = require('./onepass_crypto');
import sha1 = require('./crypto/sha1');

interface OverviewMap {
	[index: string] : ItemOverview;
}

interface ItemRevision {
	parentRevision: string;
	overview: ItemOverview;
	content: item_store.ItemContent;
}

interface ItemOverview {
	title: string;
	updatedAt: number;
	createdAt: number;
	trashed: boolean;
	typeName: string;
	openContents: item_store.ItemOpenContents;

	locations: string[];
	account: string;

	revision: string;
	parentRevision: string;
}

// prefix for encryption key entries in the encryption key
// object store
var KEY_ID_PREFIX = 'key/';

export class Store implements item_store.SyncableStore {
	private crypto: onepass_crypto.Crypto;
	private database: key_value_store.Database;
	private keyAgent: key_agent.KeyAgent;
	private keyStore: key_value_store.ObjectStore;
	private itemStore: key_value_store.ObjectStore;
	private indexUpdateQueue: collectionutil.BatchedUpdateQueue<item_store.Item>;

	onItemUpdated: event_stream.EventStream<item_store.Item>;
	onUnlock: event_stream.EventStream<void>;

	constructor(database: key_value_store.Database, keyAgent: key_agent.KeyAgent) {
		this.database = database;
		this.keyAgent = keyAgent;
		this.crypto = onepass_crypto.defaultCrypto;

		this.onItemUpdated = new event_stream.EventStream<item_store.Item>();
		this.onUnlock = new event_stream.EventStream<void>();
		
		this.initDatabase();

		this.indexUpdateQueue = new collectionutil.BatchedUpdateQueue((updates: item_store.Item[]) => {
			return this.updateIndex(updates);
		});
	}

	private initDatabase() {
		this.database.open('passcards-items', 1, (schemaUpdater) => {
			if (schemaUpdater.currentVersion() < 1) {
				schemaUpdater.createStore('key-store');
				schemaUpdater.createStore('item-store');
			}
		});

		this.keyStore = this.database.store('key-store');
		this.itemStore = this.database.store('item-store');
	}

	clear() {
		return this.database.delete().then(() => {
			this.initDatabase();
		});
	}

	unlock(pwd: string) : Q.Promise<void> {
		// FIXME - This duplicates onepass.Vault.unlock()
		return this.listKeys().then((keys) => {
			if (keys.length == 0) {
				throw new Error('No encryption keys have been saved');
			}
			return Q(key_agent.decryptKeys(keys, pwd));
		}).then((keys) => {
			var savedKeys: Q.Promise<void>[] = [];
			keys.forEach((key) => {
				savedKeys.push(this.keyAgent.addKey(key.id, key.key));
			});
			return asyncutil.eraseResult(Q.all(savedKeys)).then(() => {
				this.onUnlock.publish(null);
			});
		});
	}

	listItems(opts: item_store.ListItemsOptions = {}) : Q.Promise<item_store.Item[]> {
		var key: string;
		return this.overviewKey().then((_key) => {
			key = _key;
			return this.itemStore.get<string>('index');
		}).then((encryptedItemIndex) => {
			if (encryptedItemIndex) {
				return this.decrypt<OverviewMap>(key, encryptedItemIndex);
			} else {
				return Q(<OverviewMap>null);
			}
		}).then((overviewMap) => {
			var overviewMap = overviewMap || {};
			var items: item_store.Item[] = [];
			Object.keys(overviewMap).forEach((key) => {
				var overview = overviewMap[key];
				var item = this.itemFromOverview(key, overview);
				if (!item.isTombstone() || opts.includeTombstones) {
					items.push(item);
				}
			});

			return items;
		});
	}

	private updateIndex(updatedItems: item_store.Item[]) {
		var overviewMap = <OverviewMap>{};
		return this.listItems({includeTombstones: true}).then((items) => {
			var itemMap = collectionutil.listToMap(items, (item) => {
				return item.uuid;
			});
			updatedItems.forEach((item) => {
				itemMap.set(item.uuid, item);
			});

			itemMap.forEach((item, uuid) => {
				overviewMap[uuid] = this.overviewFromItem(item);
			});
			return this.overviewKey();
		}).then((key) => {
			return this.encrypt(key, overviewMap);
		}).then((encrypted) => {
			return this.itemStore.set('index', encrypted);
		});
	}

	private itemFromOverview(uuid: string, overview: ItemOverview) {
		var item = new item_store.Item(this, uuid);
		item.title = overview.title;
		item.updatedAt = new Date(overview.updatedAt);
		item.createdAt = new Date(overview.createdAt);
		item.trashed = overview.trashed;
		item.typeName = overview.typeName;
		item.openContents = overview.openContents;
		
		item.account = overview.account;
		item.locations = overview.locations;

		item.revision = overview.revision;
		item.parentRevision = overview.parentRevision;

		return item;
	}

	private overviewFromItem(item: item_store.Item) {
		return <ItemOverview>{
			title: item.title,
			updatedAt: item.updatedAt.getTime(),
			createdAt: item.createdAt.getTime(),
			trashed: item.trashed,
			typeName: <string>item.typeName,
			openContents: item.openContents,

			locations: item.locations,
			account: item.account,

			revision: item.revision,
			parentRevision: item.parentRevision
		};
	}

	loadItem(uuid: string, revision?: string) : Q.Promise<item_store.Item> {
		if (revision) {
			return Q.all([this.overviewKey(), this.itemStore.get<string>('revisions/' + revision)])
			.then((keyAndRevision) => {
				var key = <string>keyAndRevision[0];
				var revisionData = <string>keyAndRevision[1];
				return this.decrypt<ItemRevision>(key, revisionData);
			}).then((revision) => {
				var item = this.itemFromOverview(uuid, revision.overview);
				item.parentRevision = revision.parentRevision;
				return item;
			});
		} else {
			return this.listItems().then((items) => {
				var matches = items.filter((item) => {
					return item.uuid == uuid;
				});
				if (matches.length > 0) {
					return Q(matches[0]);
				} else {
					return Q.reject(new Error('No such item ' + uuid));
				}
			});
		}
	}

	saveItem(item: item_store.Item, source: item_store.ChangeSource) : Q.Promise<void> {
		if (source === item_store.ChangeSource.Sync) {
			// use the last-modified timestamps from the sync source
			// and update the last-synced timestamp
			item.lastSyncedAt = item.updatedAt;
		} else {
			// set last-modified time to current time
			item.updateTimestamps();
		}

		var parentRevision = item.revision;
		var cryptoParams = new key_agent.CryptoParams(key_agent.CryptoAlgorithm.AES128_OpenSSLKey);
		var key: string;
		return this.keyForItem(item).then((_key) => {
			key = _key;
			return item.getContent();
		}).then((content) => {
			item.updateOverviewFromContent(content);
			item.parentRevision = item.revision;
			item.revision = generateRevisionId(item);

			var overview = this.overviewFromItem(item);
			var revision = {
				parentRevision: item.parentRevision,
				overview: overview,
				content: content
			};
			return this.encrypt(key, revision);
		}).then((revisionData) => {
			var indexUpdated = this.indexUpdateQueue.push(item);
			var revisionSaved = this.itemStore.set('revisions/' + item.revision, revisionData);
			return asyncutil.eraseResult(Q.all([indexUpdated, revisionSaved]));
		}).then(() => {
			this.onItemUpdated.publish(item);
		});
	}

	getContent(item: item_store.Item) : Q.Promise<item_store.ItemContent> {
		var key: string;
		return this.keyForItem(item).then((_key) => {
			key = _key;
			return this.itemStore.get<string>('revisions/' + item.revision);
		}).then((revisionData) => {
			return this.decrypt<ItemRevision>(key, revisionData);
		}).then((revision) => {
			// TODO - Split item_store.ItemContent into data which can
			// be serialized directly and methods related to that data
			var content = new item_store.ItemContent();
			underscore.extend(content, revision.content);
			return content;
		});
	}

	getRawDecryptedData(item: item_store.Item) : Q.Promise<string> {
		return Q.reject(new Error('getRawDecryptedData() is not implemented'));
	}

	listKeys() : Q.Promise<key_agent.Key[]> {
		return this.keyStore.list(KEY_ID_PREFIX).then((keyIds) => {
			var keys: Q.Promise<key_agent.Key>[] = [];
			keyIds.forEach((id) => {
				keys.push(this.keyStore.get<key_agent.Key>(id));
			});
			return Q.all(keys);
		});
	}

	saveKeys(keys: key_agent.Key[], hint: string) : Q.Promise<void> {
		var keysSaved: Q.Promise<void>[] = [];
		keys.forEach((key) => {
			keysSaved.push(this.keyStore.set(KEY_ID_PREFIX + key.identifier, key));
		});
		keysSaved.push(this.keyStore.set('hint', hint));
		return asyncutil.eraseResult(Q.all(keysSaved));
	}

	passwordHint() : Q.Promise<string> {
		return this.keyStore.get<string>('hint');
	}

	lastSyncedRevision(item: item_store.Item) : Q.Promise<item_store.Item> {
		throw new Error('local_store.Store.lastSyncedRevision() not implemented');
	}

	// returns the key used to encrypt item overview data
	private overviewKey() {
		return this.keyAgent.listKeys().then((keyIds) => {
			if (keyIds.length < 1) {
				throw new Error('Unable to fetch overview key. Vault may be locked?');
			}
			return keyIds[0];
		});
	}

	// returns the key used to encrypt content for a given item
	private keyForItem(item: item_store.Item) {
		return this.overviewKey();
	}

	private encrypt<T>(key: string, data: T) {
		var cryptoParams = new key_agent.CryptoParams(key_agent.CryptoAlgorithm.AES128_OpenSSLKey);
		return this.keyAgent.encrypt(key, JSON.stringify(data), cryptoParams);
	}

	private decrypt<T>(key: string, data: string) : Q.Promise<T> {
		var cryptoParams = new key_agent.CryptoParams(key_agent.CryptoAlgorithm.AES128_OpenSSLKey);
		return this.keyAgent.decrypt(key, data, cryptoParams).then((decrypted) => {
			return <T>JSON.parse(decrypted);
		});
	}
}

export function generateRevisionId(item: item_store.Item) {
	var contentString = [item.uuid, item.parentRevision, JSON.stringify(item)].join('\n');
	var hasher = new sha1.SHA1();
	var srcBuf = collectionutil.bufferFromString(contentString);
	var digest = new Int32Array(5);
	hasher.hash(srcBuf, digest);
	return collectionutil.hexlify(digest);
}

