import assert = require('assert');
import clone = require('clone');

import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import key_agent = require('./key_agent');

/** A temporary store which keeps items only in-memory */
export class Store implements item_store.SyncableStore {
	onItemUpdated: event_stream.EventStream<item_store.Item>;
	name: string;

	private keys: key_agent.Key[];
	private items: item_store.Item[];
	private keyAgent: key_agent.KeyAgent;
	private hint: string;

	// map of (revision -> item and content)
	private content: Map<string, item_store.ItemAndContent>;

	// map of (store ID -> (item UUID -> revision))
	private lastSyncedRevisions: Map<string, Map<string, item_store.RevisionPair>>;

	private nextRevision: number;

	constructor(agent: key_agent.KeyAgent, name?: string) {
		this.onItemUpdated = new event_stream.EventStream<item_store.Item>();
		this.keyAgent = agent;
		this.name = name;
		this.nextRevision = 1;

		this.clear();
	}

	unlock(password: string): Promise<void> {
		return item_store.unlockStore(this, this.keyAgent, password);
	}

	listKeys() {
		return Promise.resolve(this.keys);
	}

	saveKeys(keys: key_agent.Key[], hint: string) {
		this.keys = <key_agent.Key[]>clone(keys);
		this.hint = hint;
		return Promise.resolve<void>(null);
	}

	listItemStates(): Promise<item_store.ItemState[]> {
		return item_store.itemStates(this);
	}

	listItems(opts: item_store.ListItemsOptions = {}) {
		let matches = this.items.filter(item => {
			if (!opts.includeTombstones && item.isTombstone()) {
				return false;
			}
			return true;
		});

		return Promise.resolve(matches);
	}

	saveItem(item: item_store.Item, source: item_store.ChangeSource) {
		return this.checkUnlocked().then(() => {
			if (source !== item_store.ChangeSource.Sync) {
				item.updateTimestamps();
			} else {
				assert(item.updatedAt);
			}

			let prevRevision = item.revision;
			return item.getContent().then((content) => {
				item.updateOverviewFromContent(content);
				item.revision = this.nextRevision.toString();
				++this.nextRevision;

				item.parentRevision = prevRevision;
				let itemRevision = item_store.cloneItem({
					item: item,
					content: content
				}, item.uuid, this);
				itemRevision.item.revision = item.revision;

				this.content.set(item.revision, {
					item: itemRevision.item,
					content: itemRevision.content
				});

				let saved = false;
				for (var i = 0; i < this.items.length; i++) {
					if (this.items[i].uuid == item.uuid) {
						this.items[i] = itemRevision.item;
						saved = true;
					}
				}

				if (!saved) {
					this.items.push(itemRevision.item);
				}

				this.onItemUpdated.publish(item);
			});
		});
	}

	loadItem(uuid: string, revision?: string) {
		return this.checkUnlocked().then(() => {
			let items = this.items.filter(item => {
				return item.uuid == uuid;
			});
			if (items.length == 0) {
				return Promise.reject<item_store.ItemAndContent>(new Error('No such item'));
			}
			if (items[0].isTombstone()) {
				return Promise.reject<item_store.ItemAndContent>(new Error('Item has been deleted'));
			}
			if (!revision) {
				revision = items[0].revision;
			}
			return Promise.resolve(this.content.get(revision));
		});
	}

	getContent(item: item_store.Item) {
		return this.checkUnlocked().then(() => {
			if (this.content.has(item.revision)) {
				return Promise.resolve(this.content.get(item.revision).content);
			} else {
				return Promise.reject<item_store.ItemContent>(new Error('No such item'));
			}
		});
	}

	getRawDecryptedData(item: item_store.Item) {
		return Promise.reject<string>(new Error('Not implemented in TempStore'));
	}

	clear() {
		this.keys = [];
		this.items = [];
		this.content = new Map<string, item_store.ItemAndContent>();
		this.lastSyncedRevisions = new Map<string, Map<string, item_store.RevisionPair>>();
		return Promise.resolve<void>(null);
	}

	passwordHint() {
		return Promise.resolve(this.hint);
	}

	getLastSyncedRevision(uuid: string, storeID: string) {
		let storeRevisions = this.lastSyncedRevisions.get(storeID);
		if (storeRevisions) {
			return Promise.resolve(storeRevisions.get(uuid));
		} else {
			return Promise.resolve<item_store.RevisionPair>(null);
		}
	}

	setLastSyncedRevision(item: item_store.Item, storeID: string, revision?: item_store.RevisionPair) {
		if (!this.lastSyncedRevisions.has(storeID)) {
			this.lastSyncedRevisions.set(storeID, new Map<string, item_store.RevisionPair>());
		}
		if (revision) {
			this.lastSyncedRevisions.get(storeID).set(item.uuid, revision);
		} else {
			this.lastSyncedRevisions.get(storeID).delete(item.uuid);
		}
		return Promise.resolve<void>(null);
	}

	lastSyncRevisions(storeID: string) {
		if (!this.lastSyncedRevisions.has(storeID)) {
			this.lastSyncedRevisions.set(storeID, new Map<string, item_store.RevisionPair>());
		}
		return Promise.resolve(this.lastSyncedRevisions.get(storeID));
	}

	private checkUnlocked() {
		return this.keyAgent.listKeys().then(keys => {
			if (keys.length === 0) {
				throw new key_agent.DecryptionError('Store is locked');
			}
		});
	}
}
