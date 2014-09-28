/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/sprintf.d.ts" />

import Q = require('q');
import sprintf = require('sprintf');
import underscore = require('underscore');

import collectionutil = require('./base/collectionutil');
import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import onepass = require('./onepass');

export interface SyncStats {
	updated: number;
	total: number;
}

export class Syncer {
	private store: item_store.Store;
	private vault: onepass.Vault;

	// promise for the result of the
	// current sync task or null if no sync
	// is in progress
	private currentSync: Q.Promise<SyncStats>;

	progress: event_stream.EventStream<SyncStats>;

	constructor(store: item_store.Store, vault: onepass.Vault) {
		this.store = store;
		this.vault = vault;
		this.progress = new event_stream.EventStream<SyncStats>();
	}

	syncKeys() : Q.Promise<void> {
		return this.vault.listKeys().then((keys) => {
			return this.store.saveKeys(keys);
		});
	}

	syncItems() : Q.Promise<SyncStats> {
		if (this.currentSync) {
			return this.currentSync;
		}

		var result = Q.defer<SyncStats>();
		this.currentSync = result.promise;
		this.currentSync.then(() => {
			this.currentSync = null;
		});

		var syncStats: SyncStats = {
			updated: 0,
			total: 0
		};

		this.progress.listen(() => {
			if (syncStats.updated == syncStats.total) {
				result.resolve(syncStats);
			}
		});

		var storeItems = this.store.listItems();
		var vaultItems = this.vault.listItems();

		Q.all([storeItems, vaultItems]).then((itemLists) => {
			var storeItems: item_store.Item[] = itemLists[0];
			var vaultItems: item_store.Item[] = itemLists[1];

			var storeItemMap = collectionutil.listToMap(storeItems, (item) => {
				return item.uuid;
			});

			var updatedVaultItems: item_store.Item[] = [];
			vaultItems.forEach((item) => {
				var storeItem = storeItemMap.get(item.uuid);

				if (!storeItem || item.updatedAt.getTime() > storeItem.updatedAt.getTime()) {
					++syncStats.total;

					updatedVaultItems.push(item);
					item.getContent().then((content) => {
						if (!storeItem) {
							storeItem = new item_store.Item();
						}
						this.updateItem(item, storeItem).then(() => {
							++syncStats.updated;
							this.progress.publish(syncStats);
						}).catch((err) => {
							result.reject(new Error(sprintf('Failed to save updates for item %s: %s', item.uuid, err)));
						});
					}).catch((err) => {
						result.reject(new Error(sprintf('Failed to retrieve updated item %s: %s', item.uuid, err)));
					});
				}
			});
			this.progress.publish(syncStats);
		}).catch((err) => {
			console.log('Failed to list items in vault or store');
			result.reject(err);
		});

		return this.currentSync;
	}

	private updateItem(vaultItem: item_store.Item, storeItem: item_store.Item) {
		storeItem.uuid = vaultItem.uuid;
		storeItem.updatedAt = vaultItem.updatedAt;
		storeItem.title = vaultItem.title;
		storeItem.typeName = vaultItem.typeName;
		storeItem.createdAt = vaultItem.createdAt;
		storeItem.location = vaultItem.location;
		storeItem.folderUuid = vaultItem.folderUuid;
		storeItem.faveIndex = vaultItem.faveIndex;
		storeItem.trashed = vaultItem.trashed;
		storeItem.openContents = underscore.clone(vaultItem.openContents);

		return vaultItem.getContent().then((content) => {
			storeItem.setContent(underscore.clone(content));
			return this.store.saveItem(storeItem);
		});
	}
}

