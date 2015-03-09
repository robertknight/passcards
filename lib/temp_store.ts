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

	private keys: key_agent.Key[];
	private items: item_store.Item[];
	private keyAgent: key_agent.KeyAgent;
	private hint: string;
	
	// map of (revision -> item and content)
	private content: Map<string, item_store.ItemAndContent>;
	private lastSyncedRevisions: Map<string, string>;

	constructor(agent: key_agent.KeyAgent) {
		this.onItemUpdated = new event_stream.EventStream<item_store.Item>();
		this.onUnlock = new event_stream.EventStream<void>();
		this.keyAgent = agent;

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

	listItems(opts: item_store.ListItemsOptions = {}) {
		var matches = this.items.filter((item) => {
			if (!opts.includeTombstones && item.isTombstone()) {
				return false;
			}
			return true;
		});

		return Q(matches);
	}

	saveItem(item: item_store.Item, source: item_store.ChangeSource) {
		if (source !== item_store.ChangeSource.Sync) {
			item.updateTimestamps();
		}

		var saved = false;
		for (var i = 0; i < this.items.length; i++) {
			if (this.items[i].uuid == item.uuid) {
				this.items[i] = item;
				saved = true;
			}
		}

		var prevRevision = item.revision;
		return item.getContent().then((content) => {
			item.updateOverviewFromContent(content);
			item.revision = item_store.generateRevisionId({ item: item, content: content });
			item.parentRevision = prevRevision;
			var itemRevision = item_store.cloneItem({ item: item, content: content }, item.uuid);

			this.content.set(item.revision, {
				item: itemRevision.item,
				content: itemRevision.content
			});

			if (!saved) {
				this.items.push(item);
			}

			this.onItemUpdated.publish(item);
		});
	}

	loadItem(uuid: string, revision?: string) {
		var items = this.items.filter((item) => {
			return item.uuid == uuid;
		});
		if (items.length == 0) {
			return Q.reject<item_store.Item>(new Error('No such item'));
		}
		if (!revision) {
			revision = items[0].revision;
		}
		return Q(this.content.get(revision).item);
	}

	getContent(item: item_store.Item) {
		if (this.content.has(item.revision)) {
			return Q(this.content.get(item.revision).content);
		} else {
			return Q.reject<item_store.ItemContent>(new Error('No such item'));
		}
	}

	getRawDecryptedData(item: item_store.Item) {
		return Q.reject<string>(new Error('Not implemented in TempStore'));
	}

	clear() {
		this.keys = [];
		this.items = [];
		this.content = new collectionutil.PMap<string, item_store.ItemAndContent>();
		this.lastSyncedRevisions = new collectionutil.PMap<string, string>();
		return Q<void>(null);
	}

	passwordHint() {
		return Q(this.hint);
	}

	getLastSyncedRevision(item: item_store.Item): Q.Promise<string> {
		return Q(this.lastSyncedRevisions.get(item.uuid));
	}

	setLastSyncedRevision(item: item_store.Item, revision: string) {
		this.lastSyncedRevisions.set(item.uuid, revision);
		return Q<void>(null);
	}

	lastSyncTimestamps() {
		var timestampMap = new collectionutil.PMap<string, Date>();
		this.items.forEach((item) => {
			var lastSyncedRev = this.lastSyncedRevisions.get(item.uuid);
			if (!lastSyncedRev) {
				return;
			}
			var lastSyncedAt = this.content.get(lastSyncedRev).item.updatedAt;
			timestampMap.set(item.uuid, lastSyncedAt);
		});
		return Q(timestampMap);
	}
}

