/// <reference path="../typings/DefinitelyTyped/clone/clone.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/sprintf.d.ts" />

import assert = require('assert');
import clone = require('clone');
import Q = require('q');
import sprintf = require('sprintf');
import underscore = require('underscore');

import collectionutil = require('./base/collectionutil');
import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import onepass = require('./onepass');

function syncLog(...args: any[]) {
	console.log.apply(null, args);
}

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
	private store: item_store.SyncableStore;
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

	constructor(store: item_store.SyncableStore, vault: onepass.Vault) {
		this.store = store;
		this.vault = vault;
		this.onProgress = new event_stream.EventStream<SyncProgress>();
		this.syncQueue = [];
	}

	/** Sync encryption keys for the vault.
	  * This does not require the vault to be unlocked.
	  */
	syncKeys() : Q.Promise<void> {
		var keys = this.vault.listKeys();
		var hint = this.vault.passwordHint();

		return Q.all([keys, hint]).then((keysAndHint) => {
			var keys = <key_agent.Key[]>keysAndHint[0];
			var hint = <string>keysAndHint[1];
			return this.store.saveKeys(keys, hint);
		});
	}

	/** Sync items from the vault to the local store.
	  * Returns a promise which is resolved when the current sync completes.
	  *
	  * Syncing items requires the vault to be unlocked.
	  */
	syncItems() : Q.Promise<SyncProgress> {
		syncLog('starting sync');
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

			var allItems: {[index: string]: boolean} = {};

			var storeItemMap = collectionutil.listToMap(storeItems, (item) => {
				allItems[item.uuid] = true;
				return item.uuid;
			});
			var vaultItemMap = collectionutil.listToMap(vaultItems, (item) => {
				allItems[item.uuid] = true;
				return item.uuid;
			});

			Object.keys(allItems).forEach((uuid) => {
				var vaultItem = vaultItemMap.get(uuid);
				var storeItem = storeItemMap.get(uuid);
				if (!storeItem || // item added in cloud
					!vaultItem || // item added locally
					// item updated either in cloud or locally
					vaultItem.updatedAt.getTime() != storeItem.updatedAt.getTime()) {
					this.syncQueue.push({
						localItem: storeItem,
						vaultItem: vaultItem
					});
					++this.syncProgress.total;
				}
			});

			this.syncProgress.state = SyncState.SyncingItems;
			this.onProgress.publish(this.syncProgress);
		}).catch((err) => {
			syncLog('Failed to list items in vault or store');
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

		var localItemContent: Q.Promise<item_store.ItemAndContent>;
		var vaultItemContent: Q.Promise<item_store.ItemAndContent>;
		var lastSyncedItemContent: Q.Promise<item_store.ItemAndContent>;

		if (localItem) {
			// fetch local item content
			localItemContent = localItem.getContent().then((content) => {
				return { item: localItem, content: content };
			});

			// fetch last-synced revision of item
			var lastSyncedItem: item_store.Item;
			lastSyncedItemContent = this.store.getLastSyncedRevision(localItem).then((revision) => {
				if (revision) {
					return this.store.loadItem(localItem.uuid, revision);
				} else {
					return null;
				}
			}).then((item) => {
				if (item) {
					lastSyncedItem = item;
					return item.getContent();
				} else {
					return null;
				}
			}).then((content) => {
				if (content) {
					return { item: lastSyncedItem, content: content };
				} else {
					return null;
				}
			});
		}

		if (vaultItem) {
			// fetch vault item content
			vaultItemContent = vaultItem.getContent().then((content) => {
				return { item: vaultItem, content: content };
			});
		}

		var contents = Q.all([localItemContent, vaultItemContent, lastSyncedItemContent]);
		contents.then((contents: any[]) => {
			this.updateItem(contents[0] /* local item */,
			                contents[1] /* vault item */,
			                contents[2] /* last synced item */)
			.then(() => {
				itemDone();
			}).catch((err: Error) => {
				this.currentSync.reject(new Error(sprintf('Failed to save updates for item %s: %s', vaultItem.uuid, err)));
				itemDone();
			});
		}).catch((err) => {
			syncLog(err.stack);
			this.currentSync.reject(new Error(sprintf('Failed to retrieve updated item %s: %s', vaultItem.uuid, err)));
			itemDone();
		});
	}

	private updateItem(storeItem: item_store.ItemAndContent,
	                   vaultItem: item_store.ItemAndContent,
	                   lastSynced: item_store.ItemAndContent) {

		var updatedStoreItem: item_store.Item;
		var saved: Q.Promise<void>;
		var revision: string;

		if (!vaultItem) {
			syncLog('syncing new item %s from store -> vault', storeItem.item.uuid);

			// new item in local store
			var clonedItem = item_store.cloneItem(storeItem, storeItem.item.uuid);
			revision = storeItem.item.revision;
			updatedStoreItem = storeItem.item;
			saved = this.vault.saveItem(clonedItem);
		} else if (!storeItem) {
			syncLog('syncing new item %s from vault -> store', vaultItem.item.uuid);

			// new item in vault
			var clonedItem = item_store.cloneItem(vaultItem, vaultItem.item.uuid);
			saved = this.store.saveItem(clonedItem, item_store.ChangeSource.Sync).then(() => {
				revision = clonedItem.revision;
				updatedStoreItem = clonedItem;
			});
		} else if (vaultItem.item.updatedAt == lastSynced.item.updatedAt) {
			syncLog('syncing updated item %s from store -> vault', storeItem.item.uuid);

			// item updated in local store
			var clonedItem = item_store.cloneItem(storeItem, storeItem.item.uuid);
			revision = storeItem.item.revision;
			updatedStoreItem = storeItem.item;
			saved = this.vault.saveItem(clonedItem);
		} else if (storeItem.item.updatedAt == lastSynced.item.updatedAt) {
			syncLog('syncing updated item %s from vault -> store', vaultItem.item.uuid);

			// item updated in vault
			var clonedItem = item_store.cloneItem(vaultItem, vaultItem.item.uuid);
			saved = this.store.saveItem(clonedItem).then(() => {
				revision = clonedItem.revision;
				updatedStoreItem = clonedItem;
			});
		} else {
			saved = Q.reject(new Error('Merging of item changes in store and vault is not implemented'));
		}
		return saved.then(() => {
			assert(revision, 'saved item does not have a revision');
			this.store.setLastSyncedRevision(updatedStoreItem, revision);
		});
	}
}

