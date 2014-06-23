import Q = require('q');

import asyncutil = require('../lib/base/asyncutil');
import consoleio = require('./console');
import item_search = require('../lib/item_search');
import onepass = require('../lib/onepass');
import stringutil = require('../lib/base/stringutil');

export class EditItemPrompt {
	private io: consoleio.TermIO;
	private item: onepass.Item;

	constructor(item: onepass.Item, io: consoleio.TermIO) {
		this.item = item;
		this.io = io;
	}

	run() : Q.Promise<boolean> {
		return this.item.getContent().then((content) => {
			return asyncutil.until(() => {
				return this.io.readLine('> ').then((action) => {
					var args = stringutil.parseCommandLine(action);
					switch (args[0]) {
					case 'done':
					case 'exit':
						return Q.resolve(true);
					case 'set':
						var fieldPattern = args[1];
						var value = args[2];

						var fields = item_search.matchField(content, fieldPattern);
						if (fields.length == 0) {
							consoleio.printf(this.io, 'No fields match "%s"', fieldPattern);
						} else if (fields.length > 1) {
							consoleio.printf(this.io, 'Multiple fields match "%s"', fieldPattern);
						} else {
							var field = fields[0];
							if (field.url) {
								field.url.url = value;
							} else if (field.field) {
								field.field.value = value;
							} else if (field.formField) {
								field.formField.value = value;
							}
						}

						this.item.setContent(content);

						return this.item.save().then(() => {
							consoleio.printf(this.io, 'Updated "%s"', field.name());
							return false;
						});
					}
				});
			});
		});
	}
}
