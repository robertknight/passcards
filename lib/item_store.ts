/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');

import collectionutil = require('./base/collectionutil');
import onepass = require('./onepass');

export interface Store {
	listItems() : Q.Promise<onepass.Item[]>;
	saveItem(item: onepass.Item) : Q.Promise<void>;
	getContent(item: onepass.Item) : Q.Promise<onepass.ItemContent>;
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
		return this.items;
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

	getContent(item: onepass.Item) {
		if (this.content.has(item.uuid)) {
			return Q.resolve(this.content.get(item.uuid));
		} else {
			return Q.reject(new Error('No such item'));
		}
	}
}

