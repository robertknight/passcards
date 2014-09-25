/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import Q = require('q');
import underscore = require('underscore');

import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import onepass = require('./onepass');

export interface SyncProgress {
	synced: number;
	total: number;
}

export interface SyncStats {
	updated: number;
	total: number;
}

export class Syncer {
	private store: Store;
	private vault: onepass.Vault;
	private currentSync: Q.Promise<SyncStats>;

	progress: event_stream.EventStream<SyncProgress>;

	constructor(store: Store, vault: onepass.Vault) {
		this.store = store;
		this.vault = vault;
		this.progress = new event_stream.EventStream<SyncProgress>();
	}

	sync() : Q.Promise<SyncStats> {
		if (this.currentSync) {
			return this.currentSync;
		}

		var result = Q.defer<SyncStats>();
		this.currentSync = result.promise;

		var syncStats: SyncStats = {
			updated: 0;
			total: 0;
		};

		this.progress.listen(() => {
			console.log('sync progress', syncStats.updated, syncStats.total);
			if (syncStats.updated == syncStats.total) {
				result.resolve(syncStats);
			}
		});

		var storeItems = this.store.listItems();
		var vaultItems = this.vault.listItems();

		Q.all([storeItems, vaultItems]).then((storeItems, vaultItems) => {
			var storeItemMap = collectionutil.listToMap(storeItems, (item) => {
				return item.id;
			});

			var updatedVaultItems: onepass.Item[] = [];
			vaultItems.forEach((item) => {
				var storeItem = storeItemMap.get(item.uuid);
				if (!storeItem || item.updatedAt > storeItem.updatedAt) {
					++syncStats.total;

					updatedVaultItems.push(item);
					item.getContent().then((content) => {
						if (!storeItem) {
							storeItem = new onepass.Item();
						}
						updateItem(item, storeItem).then(() => {
							++syncStats.updated;
							this.progress.publish(syncStats);
						}).catch((err) => {
							console.log('Failed to save updates for item %s: %s', item.uuid, err);
						});
					}).fail((err) => {
						console.log('Failed to retrieve updated item %s: %s', item.uuid, err);
					});
				}
			});
			this.progress.publish(syncStats);
		}).catch((err) => {
			console.log('Failed to list items in vault or store');
			result.reject(err);
		});

		return this.currentSync.promise;
	}

	private void updateItem(vaultItem: onepass.Item, storeItem: onepass.Item) {
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
			storeItem.save();
		});
	}
}

