/// <reference path="../typings/DefinitelyTyped/clone/clone.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import assert = require('assert');
import Q = require('q');

import collectionutil = require('./base/collectionutil');
import dateutil = require('./base/dateutil');
import event_stream = require('./base/event_stream');
import item_merge = require('./item_merge');
import item_store = require('./item_store');
import key_agent = require('./key_agent');

function syncLog(...args: any[]) {
	//	console.log.apply(console, args);
}

/** Returns true if two date/times from Item.updatedAt should
  * be considered equal for the purpose of sync.
  *
  * This function accounts for the fact that the resolution
  * of timestamps varies depending on the store - eg.
  * the Agile Keychain format uses timestamps with only
  * second-level resolution whereas local_store.Store supports
  * millisecond-resolution timestamps.
  */
export function itemUpdateTimesEqual(a: Date, b: Date) {
	return dateutil.unixTimestampFromDate(a) ==
	       dateutil.unixTimestampFromDate(b);
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

	/** Count of items that failed to sync. */
	failed: number;

	/** Total number of changed items to sync. */
	total: number;

	/** Number of items actively being synced. */
	active: number;
}

interface SyncItem {
	localItem: item_store.Item;
	remoteItem: item_store.Item;
}

/** Interface for syncing encryption keys and items between
  * a cloud-based store and a local cache.
  */
export interface Syncer {
	onProgress: event_stream.EventStream<SyncProgress>;

	/** Sync encryption keys from the remote store to the local one.
	  * This does not require the remote store to be unlocked.
	  */
	syncKeys(): Q.Promise<void>;

	/** Sync items between the local and remote stores.
	  * Returns a promise which is resolved when the current sync completes.
	  *
	  * Syncing items requires both local and remote stores
	  * to be unlocked first.
	  */
	syncItems(): Q.Promise<SyncProgress>;
}

/** Syncer implementation which syncs changes between an item_store.Store
  * representing a remote store and a local store.
  */
export class CloudStoreSyncer implements Syncer {
	private localStore: item_store.SyncableStore;
	private cloudStore: item_store.Store;

	// queue of items left to sync
	private syncQueue: SyncItem[];
	// progress of the current sync
	private syncProgress: SyncProgress;
	// promise for the result of the
	// current sync task or null if no sync
	// is in progress
	private currentSync: Q.Deferred<SyncProgress>;

	onProgress: event_stream.EventStream<SyncProgress>;

	constructor(localStore: item_store.SyncableStore, cloudStore: item_store.Store) {
		this.localStore = localStore;
		this.cloudStore = cloudStore;
		this.onProgress = new event_stream.EventStream<SyncProgress>();
		this.syncQueue = [];
	}

	syncKeys(): Q.Promise<void> {
		let keys = this.cloudStore.listKeys();

		// sync the password hint on a best-effort basis.
		// If no hint is available, display a placeholder instead.
		let hint = this.cloudStore.passwordHint().then(hint => {
			return hint;
		}).catch(err => {
			return '';
		});

		return Q.all([keys, hint]).then((keysAndHint) => {
			let keys = <key_agent.Key[]>keysAndHint[0];
			let hint = <string>keysAndHint[1];
			return this.localStore.saveKeys(keys, hint);
		});
	}

	syncItems(): Q.Promise<SyncProgress> {
		syncLog('starting sync');
		if (this.currentSync) {
			return this.currentSync.promise;
		}

		var result = Q.defer<SyncProgress>();
		this.currentSync = result;
		this.currentSync.promise.then(() => {
			syncLog('sync completed');
			this.currentSync = null;
		}).catch((err) => {
			syncLog('sync failed');
			this.currentSync = null;
		});

		this.syncProgress = {
			state: SyncState.ListingItems,
			active: 0,
			updated: 0,
			failed: 0,
			total: 0
		};

		this.onProgress.listen(() => {
			if (this.syncProgress.state == SyncState.SyncingItems) {
				var processed = this.syncProgress.updated + this.syncProgress.failed;
				if (processed == this.syncProgress.total) {
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
		var localItems = this.localStore.listItems(listOpts);
		var remoteItems = this.cloudStore.listItems(listOpts);
		var lastSyncTimes = this.localStore.lastSyncTimestamps();

		Q.all([localItems, remoteItems, lastSyncTimes]).then((itemLists) => {
			var localItems = <item_store.Item[]>itemLists[0];
			var remoteItems = <item_store.Item[]>itemLists[1];
			var lastSyncTimes = <Map<string, Date>>(itemLists[2]);

			syncLog('%d items in local store, %d in remote store', localItems.length, remoteItems.length);

			var allItems: { [index: string]: boolean } = {};

			var localItemMap = collectionutil.listToMap(localItems, (item) => {
				allItems[item.uuid] = true;
				return item.uuid;
			});
			var remoteItemMap = collectionutil.listToMap(remoteItems, (item) => {
				allItems[item.uuid] = true;
				return item.uuid;
			});

			Object.keys(allItems).forEach((uuid) => {
				var remoteItem = remoteItemMap.get(uuid);
				var localItem = localItemMap.get(uuid);
				var lastSyncedAt = lastSyncTimes.get(uuid);

				if (!localItem || // item added in cloud
					!remoteItem || // item added locally
					// item updated either in cloud or locally
					!itemUpdateTimesEqual(remoteItem.updatedAt, lastSyncedAt) ||
					!itemUpdateTimesEqual(localItem.updatedAt, lastSyncedAt)) {
					this.syncQueue.push({
						localItem: localItem,
						remoteItem: remoteItem
					});
					++this.syncProgress.total;
				}
			});

			syncLog('found %d items to sync', this.syncQueue.length);
			this.syncProgress.state = SyncState.SyncingItems;
			this.onProgress.publish(this.syncProgress);
		}).catch((err) => {
			syncLog('Failed to list items in local or remote stores', err.stack);
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
	// When syncing with a store using the Agile Keychain format
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
			this.syncItem(next.localItem, next.remoteItem);
		}
	}

	private syncItem(localItem: item_store.Item, remoteItem: item_store.Item) {
		++this.syncProgress.active;

		var itemDone = (err?: Error) => {
			--this.syncProgress.active;
			if (err) {
				++this.syncProgress.failed;
			} else {
				++this.syncProgress.updated;
			}
			this.onProgress.publish(this.syncProgress);
		};

		// fetch content for local and remote items and the last-synced
		// version of the item in order to perform a 3-way merge
		var localItemContent: Q.Promise<item_store.ItemAndContent>;
		var remoteItemContent: Q.Promise<item_store.ItemAndContent>;
		var lastSyncedItemContent: Q.Promise<item_store.ItemAndContent>;

		if (localItem) {
			localItemContent = localItem.getContent().then((content) => {
				return { item: localItem, content: content };
			});
			lastSyncedItemContent = this.getLastSyncedItemRevision(localItem);
		}

		if (remoteItem) {
			// load the full item overview data from the remote store.
			// When the remote store is an Agile Keychain-format store,
			// ItemStore.listItems() only includes the core overview metadata
			// fields and not account data or non-primary locations.
			remoteItemContent = this.cloudStore.loadItem(remoteItem.uuid);
		}

		var uuid = localItem ? localItem.uuid : remoteItem.uuid;
		var contents = Q.all([localItemContent, remoteItemContent, lastSyncedItemContent]);
		contents.then((contents: any[]) => {
			// merge changes between local/remote store items and update the
			// last-synced revision
			this.mergeAndSyncItem(contents[0] /* local item */,
				contents[1] /* remote item */,
				contents[2] /* last synced item */)
			.then(() => {
				itemDone();
			}).catch((err: Error) => {
				syncLog('Syncing item %s failed:', uuid, err);
				var itemErr = new Error(`Failed to save updates for item ${uuid}: ${err}`);
				itemDone(itemErr);
			});
		}).catch((err) => {
			syncLog('Retrieving updates for %s failed:', uuid, err);
			var itemErr = new Error(`Failed to retrieve updated item ${uuid}: ${err}`);
			itemDone(itemErr);
		});
	}

	// returns the item and content for the last-synced version of an item,
	// or null if the item has not been synced before
	private getLastSyncedItemRevision(item: item_store.Item): Q.Promise<item_store.ItemAndContent> {
		return this.localStore.getLastSyncedRevision(item).then(revision => {
			if (revision) {
				return this.localStore.loadItem(item.uuid, revision);
			} else {
				return null;
			}
		});
	}

	// given an item from the local and remote stores, one or both of which have changed
	// since the last sync, and the last-synced version of the item, merge
	// changes and save the result to the local/remote store as necessary
	//
	// When the save completes, the last-synced revision is updated in
	// the local store
	private mergeAndSyncItem(localItem: item_store.ItemAndContent,
		remoteItem: item_store.ItemAndContent,
		lastSynced: item_store.ItemAndContent) {

		var updatedStoreItem: item_store.Item;
		var saved: Q.Promise<void>;

		// revision of the item which was saved
		var revision: string;

		var clonedItem: item_store.Item;

		if (!remoteItem) {
			syncLog('syncing new item %s from local -> remote store', localItem.item.uuid);

			// new item in local store
			clonedItem = item_store.cloneItem(localItem, localItem.item.uuid).item;
			revision = localItem.item.revision;
			updatedStoreItem = localItem.item;
			saved = this.cloudStore.saveItem(clonedItem, item_store.ChangeSource.Sync);
		} else if (!localItem) {
			syncLog('syncing new item %s from remote -> local store', remoteItem.item.uuid);

			// new item in remote store
			clonedItem = item_store.cloneItem(remoteItem, remoteItem.item.uuid).item;
			saved = this.localStore.saveItem(clonedItem, item_store.ChangeSource.Sync).then(() => {
				revision = clonedItem.revision;
				updatedStoreItem = clonedItem;
			});
		} else if (itemUpdateTimesEqual(remoteItem.item.updatedAt, lastSynced.item.updatedAt)) {
			syncLog('syncing updated item %s from local -> remote store', localItem.item.uuid);

			// item updated in local store
			clonedItem = item_store.cloneItem(localItem, localItem.item.uuid).item;
			revision = localItem.item.revision;
			updatedStoreItem = localItem.item;
			saved = this.cloudStore.saveItem(clonedItem, item_store.ChangeSource.Sync);
		} else if (itemUpdateTimesEqual(localItem.item.updatedAt, lastSynced.item.updatedAt)) {
			syncLog('syncing updated item %s from remote -> local store', remoteItem.item.uuid);

			// item updated in remote store
			clonedItem = item_store.cloneItem(remoteItem, remoteItem.item.uuid).item;
			saved = this.localStore.saveItem(clonedItem, item_store.ChangeSource.Sync).then(() => {
				assert.notEqual(clonedItem.revision, localItem.item.revision);

				revision = clonedItem.revision;
				updatedStoreItem = clonedItem;
			});
		} else {
			// item updated in both local and remote stores
			syncLog('merging local and remote changes for item %s', localItem.item.uuid);

			var mergedStoreItem = item_merge.merge(localItem, remoteItem, lastSynced);
			mergedStoreItem.item.updateTimestamps();

			var mergedRemoteItem = item_store.cloneItem(mergedStoreItem, mergedStoreItem.item.uuid);

			saved = Q.all([
				this.localStore.saveItem(mergedStoreItem.item, item_store.ChangeSource.Sync),
				this.cloudStore.saveItem(mergedRemoteItem.item, item_store.ChangeSource.Sync)
			]).then(() => {
				assert.notEqual(mergedStoreItem.item.revision, localItem.item.revision);

				revision = mergedStoreItem.item.revision;
				updatedStoreItem = mergedStoreItem.item;
			});
		}
		return saved.then(() => {
			assert(revision, 'saved item does not have a revision');
			this.localStore.setLastSyncedRevision(updatedStoreItem, revision);
		});
	}
}

