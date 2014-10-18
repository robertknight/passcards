/// <reference path="../typings/DefinitelyTyped/clone/clone.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/sprintf.d.ts" />

import clone = require('clone');
import Q = require('q');
import sprintf = require('sprintf');

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

	/** Number of items actively being synced. */
	active: number;
}

interface SyncItem {
	localItem: item_store.Item;
	vaultItem: item_store.Item;
}

export class Syncer {
	private store: item_store.Store;
	private vault: onepass.Vault;

	// queue of items left to sync
	private syncQueue: SyncItem[];
	// progress of the current sync
	private syncProgress: SyncProgress;
	// promise for the result of the
	// current sync task or null if no sync
	// is in progress
	private currentSync: Q.Deferred<SyncProgress>;

	onProgress: event_stream.EventStream<SyncProgress>;

	constructor(store: item_store.Store, vault: onepass.Vault) {
		this.store = store;
		this.vault = vault;
		this.onProgress = new event_stream.EventStream<SyncProgress>();
		this.syncQueue = [];
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
			return this.currentSync.promise;
		}

		var result = Q.defer<SyncProgress>();
		this.currentSync = result;
		this.currentSync.promise.then(() => {
			this.currentSync = null;
		});

		this.syncProgress = {
			state: SyncState.ListingItems,
			active: 0,
			updated: 0,
			total: 0
		};

		this.onProgress.listen(() => {
			if (this.syncProgress.state == SyncState.SyncingItems) {
				if (this.syncProgress.updated == this.syncProgress.total) {
					this.syncProgress.state = SyncState.Idle;
					this.onProgress.publish(this.syncProgress);
					result.resolve(this.syncProgress);
				} else {
					this.syncNextBatch();
				}
			}
		}, 'sync-progress');
		this.onProgress.publish(this.syncProgress);

		var listOpts = { includeTombstones: true };
		var storeItems = this.store.listItems(listOpts);
		var vaultItems = this.vault.listItems(listOpts);

		Q.all([storeItems, vaultItems]).then((itemLists) => {
			var storeItems: item_store.Item[] = itemLists[0];
			var vaultItems: item_store.Item[] = itemLists[1];

			var storeItemMap = collectionutil.listToMap(storeItems, (item) => {
				return item.uuid;
			});

			vaultItems.forEach((item) => {
				var storeItem = storeItemMap.get(item.uuid);
				if (!storeItem || item.updatedAt.getTime() > storeItem.updatedAt.getTime()) {
					this.syncQueue.push({
						localItem: storeItem,
						vaultItem: item
					});
					++this.syncProgress.total;
				}
			});

			this.syncProgress.state = SyncState.SyncingItems;
			this.onProgress.publish(this.syncProgress);
		}).catch((err) => {
			console.log('Failed to list items in vault or store');
			result.reject(err);

			this.syncProgress.state = SyncState.Idle;
			this.onProgress.publish(this.syncProgress);
		});

		this.syncNextBatch();

		return this.currentSync.promise;
	}

	// sync the next batch of items. This adds items
	// to the queue to sync until the limit of concurrent items
	// being updated at once reaches a limit.
	//
	// When syncing with a vault using the Agile Keychain format
	// and Dropbox, there is one file to fetch per-item so this
	// batching nicely maps to network requests that we'll need
	// to make. If we switch to the Cloud Keychain format (or another
	// format) in future which stores multiple items per file,
	// the concept of syncing batches of items may no longer
	// be needed or may need to work differently.
	private syncNextBatch() {
		var SYNC_MAX_ACTIVE_ITEMS = 10;
		while (this.syncProgress.active < SYNC_MAX_ACTIVE_ITEMS &&
		       this.syncQueue.length > 0) {
			var next = this.syncQueue.shift();
			this.syncItem(next.localItem, next.vaultItem);
		}
	}

	private syncItem(localItem: item_store.Item, vaultItem: item_store.Item) {
		++this.syncProgress.active;

		var itemDone = () => {
			--this.syncProgress.active;
			++this.syncProgress.updated;
			this.onProgress.publish(this.syncProgress);
		};
		vaultItem.getContent().then((content) => {
			if (!localItem) {
				localItem = new item_store.Item();
			}
			this.updateItem(vaultItem, localItem).then(() => {
				itemDone();
			}).catch((err) => {
				this.currentSync.reject(new Error(sprintf('Failed to save updates for item %s: %s', vaultItem.uuid, err)));
				itemDone();
			});
		}).catch((err) => {
			this.currentSync.reject(new Error(sprintf('Failed to retrieve updated item %s: %s', vaultItem.uuid, err)));
			itemDone();
		});
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

