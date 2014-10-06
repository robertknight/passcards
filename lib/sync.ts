/// <reference path="../typings/DefinitelyTyped/clone/clone.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/sprintf.d.ts" />

import clone = require('clone');
import Q = require('q');
import sprintf = require('sprintf');
import underscore = require('underscore');

import collectionutil = require('./base/collectionutil');
import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import onepass = require('./onepass');

export enum SyncState {
	/** Sync is not currently in progress */
	Idle,

	/** Sync is enumerating changed items */
	ListingItems,

	/** Sync is fetching and updating changed items */
	SyncingItems
}

export interface SyncProgress {
	state: SyncState;

	/** Count of items that have been synced. */
	updated: number;

	/** Total number of changed items to sync. */
	total: number;
}

export class Syncer {
	private store: item_store.Store;
	private vault: onepass.Vault;

	// promise for the result of the
	// current sync task or null if no sync
	// is in progress
	private currentSync: Q.Promise<SyncProgress>;

	onProgress: event_stream.EventStream<SyncProgress>;

	constructor(store: item_store.Store, vault: onepass.Vault) {
		this.store = store;
		this.vault = vault;
		this.onProgress = new event_stream.EventStream<SyncProgress>();
	}

	/** Sync encryption keys for the vault.
	  * This does not require the vault to be unlocked.
	  */
	syncKeys() : Q.Promise<void> {
		return this.vault.listKeys().then((keys) => {
			return this.store.saveKeys(keys);
		});
	}

	/** Sync items from the vault to the local store.
	  * Returns a promise which is resolved when the current sync completes.
	  *
	  * Syncing items requires the vault to be unlocked.
	  */
	syncItems() : Q.Promise<SyncProgress> {
		if (this.currentSync) {
			return this.currentSync;
		}

		var result = Q.defer<SyncProgress>();
		this.currentSync = result.promise;
		this.currentSync.then(() => {
			this.currentSync = null;
		});

		var syncProgress: SyncProgress = {
			state: SyncState.ListingItems,
			updated: 0,
			total: 0
		};

		this.onProgress.listen(() => {
			if (syncProgress.state == SyncState.SyncingItems &&
			    syncProgress.updated == syncProgress.total) {
				
				syncProgress.state = SyncState.Idle;
				this.onProgress.publish(syncProgress);

				result.resolve(syncProgress);
			}
		});
		this.onProgress.publish(syncProgress);

		var listOpts = { includeTombstones: true };
		var storeItems = this.store.listItems(listOpts);
		var vaultItems = this.vault.listItems(listOpts);

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
					++syncProgress.total;

					var itemDone = () => {
						++syncProgress.updated;
						this.onProgress.publish(syncProgress);
					};

					updatedVaultItems.push(item);
					item.getContent().then((content) => {
						if (!storeItem) {
							storeItem = new item_store.Item();
						}
						this.updateItem(item, storeItem).then(() => {
							itemDone();
						}).catch((err) => {
							result.reject(new Error(sprintf('Failed to save updates for item %s: %s', item.uuid, err)));
							itemDone();
						});
					}).catch((err) => {
						result.reject(new Error(sprintf('Failed to retrieve updated item %s: %s', item.uuid, err)));
						itemDone();
					});
				}
			});

			syncProgress.state = SyncState.SyncingItems;
			this.onProgress.publish(syncProgress);
		}).catch((err) => {
			console.log('Failed to list items in vault or store');
			result.reject(err);

			syncProgress.state = SyncState.Idle;
			this.onProgress.publish(syncProgress);
		});

		return this.currentSync;
	}

	private updateItem(vaultItem: item_store.Item, storeItem: item_store.Item) {
		storeItem.uuid = vaultItem.uuid;
		storeItem.updatedAt = vaultItem.updatedAt;
		storeItem.title = vaultItem.title;
		storeItem.typeName = vaultItem.typeName;
		storeItem.createdAt = vaultItem.createdAt;
		storeItem.folderUuid = vaultItem.folderUuid;
		storeItem.faveIndex = vaultItem.faveIndex;
		storeItem.trashed = vaultItem.trashed;
		storeItem.openContents = <item_store.ItemOpenContents>clone(vaultItem.openContents);

		return vaultItem.getContent().then((content) => {
			storeItem.setContent(<item_store.ItemContent>clone(content));
			return this.store.saveItem(storeItem);
		});
	}
}

