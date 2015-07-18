/// <reference path="../typings/DefinitelyTyped/clone/clone.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import assert = require('assert');
import Q = require('q');

import collectionutil = require('./base/collectionutil');
import dateutil = require('./base/dateutil');
import err_util = require('./base/err_util');
import event_stream = require('./base/event_stream');
import item_merge = require('./item_merge');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import logging = require('./base/logging');

export class SyncError extends err_util.BaseError {
	constructor(message: string, sourceErr?: Error) {
		super(message, sourceErr);
	}
}

let syncLog = new logging.BasicLogger('sync');
syncLog.level = logging.Level.Warn;

const REMOTE_STORE = 'cloud';

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
	localItem: item_store.ItemState;
	remoteItem: item_store.ItemState;
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
			var keys = <key_agent.Key[]>keysAndHint[0];
			var hint = <string>keysAndHint[1];
			return this.localStore.saveKeys(keys, hint);
		});
	}

	syncItems(): Q.Promise<SyncProgress> {
		if (this.currentSync) {
			// if a sync is already in progress, complete the current sync first.
			// This should queue up a new sync to complete once the current one finishes.
			return this.currentSync.promise;
		}
		syncLog.info('Starting sync');

		var result = Q.defer<SyncProgress>();
		this.currentSync = result;
		this.currentSync.promise.then(() => {
			syncLog.info('Sync completed');
			this.currentSync = null;
		}).catch(err => {
			syncLog.error('Sync failed', err.toString());
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
				syncLog.info({
					updated: this.syncProgress.updated,
					failed: this.syncProgress.failed,
					total: this.syncProgress.total
				});

				if (processed == this.syncProgress.total) {
					this.syncProgress.state = SyncState.Idle;
					this.notifyProgress();
					result.resolve(this.syncProgress);
				} else {
					this.syncNextBatch();
				}
			}
		}, 'sync-progress');
		this.notifyProgress();

		let localItems = this.localStore.listItemStates();
		let remoteItems = this.cloudStore.listItemStates();
		let lastSyncRevisions = this.localStore.lastSyncRevisions(REMOTE_STORE);

		Q.all([localItems, remoteItems, lastSyncRevisions]).then(itemLists => {
			let localItems = <item_store.ItemState[]>itemLists[0];
			let remoteItems = <item_store.ItemState[]>itemLists[1];
			let lastSyncedRevisions = <Map<string, item_store.RevisionPair>>itemLists[2];

			syncLog.info('%d items in remote store, %d in local store', localItems.length, remoteItems.length);

			var allItems: { [index: string]: boolean } = {};

			let localItemMap = collectionutil.listToMap(localItems, item => {
				allItems[item.uuid] = true;
				return item.uuid;
			});
			let remoteItemMap = collectionutil.listToMap(remoteItems, item => {
				allItems[item.uuid] = true;
				return item.uuid;
			});

			Object.keys(allItems).forEach(uuid => {
				let remoteItem = remoteItemMap.get(uuid);
				let localItem = localItemMap.get(uuid);
				let syncItem = false;

				if (!localItem) {
					// item added in cloud
					syncItem = true;
					syncLog.info('%s added in cloud (rev %s)', remoteItem.uuid, remoteItem.revision);
				} else if (!remoteItem) {
					// item added locally
					syncItem = true;
					syncLog.info('%s added locally (rev %s)', localItem.uuid, localItem.revision);
				} else if (localItem.deleted != remoteItem.deleted) {
					// item deleted locally or in cloud
					syncItem = true;
					if (localItem.deleted) {
						syncLog.info('%s deleted locally', localItem.uuid);
					} else {
						syncLog.info('%s deleted in cloud', remoteItem.uuid);
					}
				} else {
					let lastSyncedRevision = lastSyncedRevisions.get(uuid);
					if (!lastSyncedRevision) {
						syncLog.warn('No last synced revision available for %s', uuid);
						lastSyncedRevision = {
							local: '',
							external: ''
						};
					}

					if (remoteItem.revision != lastSyncedRevision.external) {
						// item updated in cloud
						syncItem = true;
						syncLog.info('%s updated in cloud (last synced rev %s, current rev %s)', remoteItem.uuid,
							lastSyncedRevision.external, remoteItem.revision);
					}

					if (localItem.revision != lastSyncedRevision.local) {
						// item updated locally
						syncItem = true;
						syncLog.info('%s updated locally (last synced rev %s, current rev %s)', localItem.uuid,
							lastSyncedRevision.local, localItem.revision);
					}
				}

				if (syncItem) {
					this.syncQueue.push({
						localItem: localItem,
						remoteItem: remoteItem
					});
					++this.syncProgress.total;
				}
			});

			syncLog.info('found %d items to sync', this.syncQueue.length);
			this.syncProgress.state = SyncState.SyncingItems;
			this.notifyProgress();
		}).catch(err => {
			syncLog.error('Failed to list items in local or remote stores', err.stack);
			result.reject(err);

			this.syncProgress.state = SyncState.Idle;
			this.notifyProgress();
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

	private notifyProgress() {
		this.onProgress.publish(this.syncProgress);
	}

	private syncItem(localItem: item_store.ItemState, remoteItem: item_store.ItemState) {
		assert(localItem || remoteItem, 'either local or remote source item missing');

		++this.syncProgress.active;

		var itemDone = (err?: Error) => {
			--this.syncProgress.active;
			if (err) {
				++this.syncProgress.failed;
			} else {
				++this.syncProgress.updated;
			}
			this.notifyProgress();
		};

		// fetch content for local and remote items and the last-synced
		// version of the item in order to perform a 3-way merge
		var localItemContent: Q.Promise<item_store.ItemAndContent>;
		var remoteItemContent: Q.Promise<item_store.ItemAndContent>;
		var lastSyncedItemContent: Q.Promise<item_store.ItemAndContent>;

		if (localItem) {
			localItemContent = this.localStore.loadItem(localItem.uuid);
			lastSyncedItemContent = this.getLastSyncedItemRevision(localItem.uuid);
		}

		if (remoteItem) {
			remoteItemContent = this.cloudStore.loadItem(remoteItem.uuid);
		}

		var uuid = localItem ? localItem.uuid : remoteItem.uuid;
		var contents = Q.all([localItemContent, remoteItemContent, lastSyncedItemContent]);
		contents.then((contents: [item_store.ItemAndContent,
			item_store.ItemAndContent,
			item_store.ItemAndContent]) => {
			// merge changes between local/remote store items and update the
			// last-synced revision
			this.mergeAndSyncItem(contents[0] /* local item */,
				contents[1] /* remote item */,
				contents[2] /* last synced item */)
			.then(() => {
				syncLog.info('Synced changes for item %s', uuid);
				itemDone();
			}).catch((err: Error) => {
				syncLog.error('Syncing item %s failed:', uuid, err);
				var itemErr = new SyncError(`Failed to save updates for item ${uuid}`, err);
				itemDone(itemErr);
			});
		}).catch(err => {
			syncLog.error('Retrieving updates for %s failed:', uuid, err);
			var itemErr = new SyncError(`Failed to retrieve updated item ${uuid}`, err);
			itemDone(itemErr);
		});
	}

	// returns the item and content for the last-synced version of an item,
	// or null if the item has not been synced before
	private getLastSyncedItemRevision(uuid: string): Q.Promise<item_store.ItemAndContent> {
		return this.localStore.getLastSyncedRevision(uuid, REMOTE_STORE).then(revision => {
			if (revision) {
				return this.localStore.loadItem(uuid, revision.local);
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

		assert(localItem || remoteItem, 'neither local nor remote item specified');
		if (localItem && remoteItem) {
			assert(lastSynced, 'lastSynced item not available for already-synced item');
		}

		let remoteRevision: string;
		if (remoteItem) {
			remoteRevision = remoteItem.item.revision;
			assert(remoteRevision, 'item does not have a remote revision');
		}

		let updatedStoreItem: item_store.Item;
		let saved: Q.Promise<void>;

		// revision of the item which was saved
		let newLocalRevision: string;

		let clonedItem: item_store.Item;

		if (!remoteItem) {
			assert(localItem.item.revision, 'local item does not have a revision');
			syncLog.info('syncing new item %s from local -> remote store', localItem.item.uuid);

			// new item in local store
			clonedItem = item_store.cloneItem(localItem, localItem.item.uuid).item;
			newLocalRevision = localItem.item.revision;
			updatedStoreItem = localItem.item;
			saved = this.cloudStore.saveItem(clonedItem, item_store.ChangeSource.Sync);
		} else if (!localItem) {
			syncLog.info('syncing new item %s from remote -> local store', remoteItem.item.uuid);

			// new item in remote store
			clonedItem = item_store.cloneItem(remoteItem, remoteItem.item.uuid).item;
			saved = this.localStore.saveItem(clonedItem, item_store.ChangeSource.Sync).then(() => {
				assert(clonedItem.revision, 'item cloned from remote store does not have a revision');
				newLocalRevision = clonedItem.revision;
				updatedStoreItem = clonedItem;
			});
		} else if (itemUpdateTimesEqual(remoteItem.item.updatedAt, lastSynced.item.updatedAt)) {
			assert('updated local item does not have a revision', localItem.item.revision);
			syncLog.info('syncing updated item %s from local -> remote store', localItem.item.uuid);

			// item updated in local store
			clonedItem = item_store.cloneItem(localItem, localItem.item.uuid).item;
			newLocalRevision = localItem.item.revision;
			updatedStoreItem = localItem.item;
			saved = this.cloudStore.saveItem(clonedItem, item_store.ChangeSource.Sync);
		} else if (itemUpdateTimesEqual(localItem.item.updatedAt, lastSynced.item.updatedAt)) {
			syncLog.info('syncing updated item %s from remote -> local store', remoteItem.item.uuid);

			// item updated in remote store
			clonedItem = item_store.cloneItem(remoteItem, remoteItem.item.uuid).item;
			saved = this.localStore.saveItem(clonedItem, item_store.ChangeSource.Sync).then(() => {
				assert(clonedItem.revision, 'updated local item does not have a revision');
				assert.notEqual(clonedItem.revision, localItem.item.revision);

				newLocalRevision = clonedItem.revision;
				updatedStoreItem = clonedItem;
			});
		} else {
			// item updated in both local and remote stores
			syncLog.info('merging local and remote changes for item %s', localItem.item.uuid);

			var mergedStoreItem = item_merge.merge(localItem, remoteItem, lastSynced);
			mergedStoreItem.item.updateTimestamps();

			var mergedRemoteItem = item_store.cloneItem(mergedStoreItem, mergedStoreItem.item.uuid);

			saved = Q.all([
				this.localStore.saveItem(mergedStoreItem.item, item_store.ChangeSource.Sync),
				this.cloudStore.saveItem(mergedRemoteItem.item, item_store.ChangeSource.Sync)
			]).then(() => {
				assert(mergedStoreItem.item.revision, 'merged local item does not have a revision');
				assert.notEqual(mergedStoreItem.item.revision, localItem.item.revision);

				newLocalRevision = mergedStoreItem.item.revision;
				updatedStoreItem = mergedStoreItem.item;
			});
		}
		return saved.then(() => {
			assert(newLocalRevision, 'saved item does not have a revision');
			this.localStore.setLastSyncedRevision(updatedStoreItem, REMOTE_STORE, {
				local: newLocalRevision,
				external: remoteRevision
			});
		});
	}
}
