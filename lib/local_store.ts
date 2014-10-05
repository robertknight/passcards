/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');
import underscore = require('underscore');

import asyncutil = require('./base/asyncutil');
import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import key_value_store = require('./base/key_value_store');
import onepass_crypto = require('./onepass_crypto');

var DB_NAME = 'passcards-store';

interface EncryptedOverview {
	data: string;
}

interface EncryptedContent {
	data: string;
}

interface ItemOverview {
	title: string;
	updatedAt: number;
	createdAt: number;
	location: string;
	trashed: boolean;
	typeName: string;
	openContents: item_store.ItemOpenContents;
}

export class Store implements item_store.Store {
	private crypto: onepass_crypto.Crypto;
	private keyAgent: key_agent.KeyAgent;
	private keyStore: key_value_store.ObjectStore;
	private itemStore: key_value_store.ObjectStore;

	onItemUpdated: event_stream.EventStream<item_store.Item>;
	onUnlock: event_stream.EventStream<void>;

	constructor(database: key_value_store.Database, keyAgent: key_agent.KeyAgent) {
		database.open('passcards-items', 1, (schemaUpdater) => {
			if (schemaUpdater.currentVersion() < 1) {
				schemaUpdater.createStore('key-store');
				schemaUpdater.createStore('item-store');
			}
		});

		this.keyAgent = keyAgent;
		this.crypto = onepass_crypto.defaultCrypto;

		this.keyStore = database.store('key-store');
		this.itemStore = database.store('item-store');

		this.onItemUpdated = new event_stream.EventStream<item_store.Item>();
		this.onUnlock = new event_stream.EventStream<void>();
	}

	unlock(pwd: string) : Q.Promise<void> {
		// FIXME - This duplicates onepass.Vault.unlock()
		return this.listKeys().then((keys) => {
			return key_agent.decryptKeys(keys, pwd);
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
		return this.itemStore.list('overview/').then((keys) => {
			var items: Q.Promise<item_store.Item>[] = [];
			keys.forEach((key) => {
				var itemId = key.slice('overview/'.length);
				items.push(this.loadItem(itemId));
			});
			return Q.all(items).then((items) => {
				var filteredItems = items.filter((item) => {
					return !item.isTombstone() || opts.includeTombstones;
				});
				return filteredItems;
			});
		});
	}

	loadItem(uuid: string) : Q.Promise<item_store.Item> {
		var key: string;
		return this.overviewKey().then((_key) => {
			key = _key;
			return this.itemStore.get<EncryptedOverview>('overview/' + uuid);
		}).then((encryptedOverview) => {
			return this.keyAgent.decrypt(key, encryptedOverview.data, {algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey});
		}).then((decrypted) => {
			var overview = <ItemOverview>JSON.parse(decrypted);

			var item = new item_store.Item(this, uuid);
			item.title = overview.title;
			item.updatedAt = new Date(overview.updatedAt);
			item.createdAt = new Date(overview.createdAt);
			item.location = overview.location;
			item.trashed = overview.trashed;
			item.typeName = overview.typeName;
			item.openContents = overview.openContents;
			return item;
		});
	}

	saveItem(item: item_store.Item) : Q.Promise<void> {
		item.updateTimestamps();

		var cryptoParams = new key_agent.CryptoParams(key_agent.CryptoAlgorithm.AES128_OpenSSLKey);
		var key: string;
		return this.keyForItem(item).then((_key) => {
			key = _key;
			return item.getContent();
		}).then((content) => {
			var itemOverview: ItemOverview = {
				title: item.title,
				updatedAt: item.updatedAt.getTime(),
				createdAt: item.createdAt.getTime(),
				location: item.location,
				trashed: item.trashed,
				typeName: <string>item.typeName,
				openContents: item.openContents
			};
			var contentData = this.keyAgent.encrypt(key, JSON.stringify(content), cryptoParams);
			var overviewData = this.keyAgent.encrypt(key, JSON.stringify(itemOverview), cryptoParams);
			return Q.all([contentData, overviewData]);
		}).then((encrypted) => {
			var contentData = encrypted[0];
			var overviewData = encrypted[1];

			var encryptedContent: EncryptedContent = {
				data: contentData
			};

			var encryptedOverview: EncryptedOverview = {
				data: overviewData
			};

			var overviewSaved = this.itemStore.set('overview/' + item.uuid, encryptedOverview);
			var contentSaved = this.itemStore.set('content/' + item.uuid, encryptedContent);
			return asyncutil.eraseResult(Q.all([overviewSaved, contentSaved]));
		}).then(() => {
			this.onItemUpdated.publish(item);
		});
	}

	getContent(item: item_store.Item) : Q.Promise<item_store.ItemContent> {
		var key: string;
		return this.keyForItem(item).then((_key) => {
			key = _key;
			return this.itemStore.get<EncryptedContent>('content/' + item.uuid);
		}).then((encryptedContent) => {
			return this.keyAgent.decrypt(key, encryptedContent.data, {algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey});
		}).then((decrypted) => {
			// TODO - Split item_store.ItemContent into data which can
			// be serialized directly and methods related to that data
			var content = new item_store.ItemContent();
			underscore.extend(content, JSON.parse(decrypted));
			return content;
		});
	}

	getRawDecryptedData(item: item_store.Item) : Q.Promise<string> {
		return Q.reject(new Error('getRawDecryptedData() is not implemented'));
	}

	listKeys() : Q.Promise<key_agent.Key[]> {
		return this.keyStore.list().then((keyIds) => {
			var keys: Q.Promise<key_agent.Key>[] = [];
			keyIds.forEach((id) => {
				keys.push(this.keyStore.get<key_agent.Key>(id));
			});
			return Q.all(keys);
		});
	}

	saveKeys(keys: key_agent.Key[]) : Q.Promise<void> {
		var keysSaved: Q.Promise<void>[] = [];
		keys.forEach((key) => {
			keysSaved.push(this.keyStore.set(key.identifier, key));
		});
		return asyncutil.eraseResult(Q.all(keysSaved));
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
}

