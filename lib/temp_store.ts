import clone = require('clone');
import Q = require('q');

import asyncutil = require('./base/asyncutil');
import collectionutil = require('./base/collectionutil');
import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import key_agent = require('./key_agent');

/** A temporary store which keeps items only in-memory */
export class Store implements item_store.SyncableStore {
	onItemUpdated: event_stream.EventStream<item_store.Item>;
	onUnlock: event_stream.EventStream<void>;
	name: string;

	private keys: key_agent.Key[];
	private items: item_store.Item[];
	private keyAgent: key_agent.KeyAgent;
	private hint: string;
	
	// map of (revision -> item and content)
	private content: Map<string, item_store.ItemAndContent>;
	
	// map of (store ID -> (item UUID -> revision))
	private lastSyncedRevisions: Map<string, Map<string, item_store.RevisionPair>>;

	constructor(agent: key_agent.KeyAgent, name?: string) {
		this.onItemUpdated = new event_stream.EventStream<item_store.Item>();
		this.onUnlock = new event_stream.EventStream<void>();
		this.keyAgent = agent;
		this.name = name;

		this.clear();
	}

	unlock(password: string): Q.Promise<void> {
		return key_agent.decryptKeys(this.keys, password).then((keys) => {
			var savedKeys: Q.Promise<void>[] = [];
			keys.forEach((key) => {
				savedKeys.push(this.keyAgent.addKey(key.id, key.key));
			});
			return asyncutil.eraseResult(Q.all(savedKeys)).then(() => {
				this.onUnlock.publish(null);
			});
		});
	}

	listKeys() {
		return Q(this.keys);
	}

	saveKeys(keys: key_agent.Key[], hint: string) {
		this.keys = <key_agent.Key[]>clone(keys);
		this.hint = hint;
		return Q<void>(null);
	}

	listItemStates(): Q.Promise<item_store.ItemState[]> {
		return item_store.itemStates(this);
	}

	listItems(opts: item_store.ListItemsOptions = {}) {
		let matches = this.items.filter(item => {
			if (!opts.includeTombstones && item.isTombstone()) {
				return false;
			}
			return true;
		});

		return Q(matches);
	}

	saveItem(item: item_store.Item, source: item_store.ChangeSource) {
		return this.checkUnlocked().then(() => {
			if (source !== item_store.ChangeSource.Sync) {
				item.updateTimestamps();
			}

			let saved = false;
			for (var i = 0; i < this.items.length; i++) {
				if (this.items[i].uuid == item.uuid) {
					this.items[i] = item;
					saved = true;
				}
			}

			let prevRevision = item.revision;
			return item.getContent().then((content) => {
				item.updateOverviewFromContent(content);
				item.revision = item_store.generateRevisionId({ item: item, content: content });
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

				if (!saved) {
					this.items.push(item);
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
				return Q.reject<item_store.ItemAndContent>(new Error('No such item'));
			}
			if (!revision) {
				revision = items[0].revision;
			}
			return Q(this.content.get(revision));
		});
	}

	getContent(item: item_store.Item) {
		return this.checkUnlocked().then(() => {
			if (this.content.has(item.revision)) {
				return Q(this.content.get(item.revision).content);
			} else {
				return Q.reject<item_store.ItemContent>(new Error('No such item'));
			}
		});
	}

	getRawDecryptedData(item: item_store.Item) {
		return Q.reject<string>(new Error('Not implemented in TempStore'));
	}

	clear() {
		this.keys = [];
		this.items = [];
		this.content = new collectionutil.PMap<string, item_store.ItemAndContent>();
		this.lastSyncedRevisions = new Map<string, Map<string, item_store.RevisionPair>>();
		return Q<void>(null);
	}

	passwordHint() {
		return Q(this.hint);
	}

	getLastSyncedRevision(uuid: string, storeID: string) {
		let storeRevisions = this.lastSyncedRevisions.get(storeID);
		if (storeRevisions) {
			return Q(storeRevisions.get(uuid));
		} else {
			return Q<item_store.RevisionPair>(null);
		}
	}

	setLastSyncedRevision(item: item_store.Item, storeID: string, revision: item_store.RevisionPair) {
		if (!this.lastSyncedRevisions.has(storeID)) {
			this.lastSyncedRevisions.set(storeID, new Map<string, item_store.RevisionPair>());
		}
		this.lastSyncedRevisions.get(storeID).set(item.uuid, revision);
		return Q<void>(null);
	}

	lastSyncRevisions(storeID: string) {
		return Q(this.lastSyncedRevisions.get(storeID));
	}

	private checkUnlocked() {
		return this.keyAgent.listKeys().then(keys => {
			if (keys.length === 0) {
				throw new key_agent.DecryptionError('Store is locked');
			}
		});
	}
}

