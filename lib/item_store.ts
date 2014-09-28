/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');

import collectionutil = require('./base/collectionutil');
import onepass = require('./onepass');

export interface Store {
	/** List all of the items in the store */
	listItems() : Q.Promise<onepass.Item[]>;

	/** Load the item with a specific ID */
	loadItem(uuid: string) : Q.Promise<onepass.Item>;

	/** Save changes to the overview data and item content
	  * back to the store.
	  */
	saveItem(item: onepass.Item) : Q.Promise<void>;

	/** Fetch and decrypt the item's secure contents. */
	getContent(item: onepass.Item) : Q.Promise<onepass.ItemContent>;

	/** Fetch and decrypt item's secure contents and return
	  * as a raw string - ie. without parsing the data and converting
	  * to an ItemContent instance.
	  */
	getRawDecryptedData(item: onepass.Item) : Q.Promise<string>;
}

/** A temporary store which keeps items only in-memory */
export class TempStore implements Store {
	private items: onepass.Item[];
	private content: collectionutil.PMap<string,onepass.ItemContent>;

	constructor() {
		this.items = [];
		this.content = new collectionutil.PMap<string,onepass.ItemContent>();
	}

	listItems() {
		return Q(this.items);
	}

	saveItem(item: onepass.Item) {
		var saved = false;
		for (var i=0; i < this.items.length; i++) {
			if (this.items[i].uuid == item.uuid) {
				this.items[i] = item;
				saved = true;
			}
		}
		if (!saved) {
			this.items.push(item);
		}
		return item.getContent().then((content) => {
			this.content.set(item.uuid, content);
		});
	}

	loadItem(uuid: string) {
		var items = this.items.filter((item) => {
			return item.uuid == uuid;
		});
		if (items.length == 0) {
			return Q.reject(new Error('No such item'));
		} else {
			return Q(item);
		}
	}

	getContent(item: onepass.Item) {
		if (this.content.has(item.uuid)) {
			return Q(this.content.get(item.uuid));
		} else {
			return Q.reject(new Error('No such item'));
		}
	}

	getRawDecryptedData(item: onepass.Item) {
		return Q.reject(new Error('Not implemented in TempStore'));
	}
}

