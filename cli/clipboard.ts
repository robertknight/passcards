/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

import Q = require('q');

export interface Clipboard {
	setData(content: string) : Q.Promise<void>;
	getData() : Q.Promise<string>;
	clear() : Q.Promise<void>;
}

export class FakeClipboard implements Clipboard {
	data: string

	constructor() {
		this.data = '';
	}

	setData(content: string) : Q.Promise<void> {
		this.data = content;
		return Q.resolve<void>(null);
	}

	getData() : Q.Promise<string> {
		return Q.resolve(this.data);
	}

	clear() : Q.Promise<void> {
		return Q.resolve<void>(null);
	}
}

export function createPlatformClipboard() : Clipboard {
	return new FakeClipboard();
}

