/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

import child_process = require('child_process');
import os = require('os');
import Q = require('q');

import asyncutil = require('../lib/base/asyncutil');

export interface Clipboard {
	setData(content: string): Q.Promise<void>;
	getData(): Q.Promise<string>;
	clear(): Q.Promise<void>;
}

export class FakeClipboard implements Clipboard {
	data: string

	constructor() {
		this.data = '';
	}

	setData(content: string): Q.Promise<void> {
		this.data = content;
		return Q<void>(null);
	}

	getData(): Q.Promise<string> {
		return Q(this.data);
	}

	clear(): Q.Promise<void> {
		this.data = '';
		return Q<void>(null);
	}
}

// run an external command, feeding it 'input' if non-null and return
// a promise for the output
function exec(command: string, input?: string): Q.Promise<string> {
	var stdout = Q.defer<string>();
	var child = child_process.exec(command, (err, _stdout, stderr) => {
		if (err) {
			stdout.reject(err);
			return;
		}
		stdout.resolve(_stdout.toString());
	});
	if (typeof input != 'undefined') {
		child.stdin.write(input);
		child.stdin.end();
		child.stdin.on('error', (err: any) => {
			stdout.reject(err);
		});
	}
	return stdout.promise;
}

export class X11Clipboard implements Clipboard {
	// TODO - Improve error handling if xsel is not installed

	setData(content: string): Q.Promise<void> {
		return asyncutil.eraseResult(exec('xsel --clipboard --input', content));
	}

	getData(): Q.Promise<string> {
		return exec('xsel --clipboard --output');
	}

	clear(): Q.Promise<void> {
		return asyncutil.eraseResult(exec('xsel --clipboard --clear'));
	}
}

export class MacClipboard implements Clipboard {
	setData(content: string): Q.Promise<void> {
		return asyncutil.eraseResult(exec('pbcopy', content));
	}

	getData(): Q.Promise<string> {
		return exec('pbpaste');
	}

	clear(): Q.Promise<void> {
		return asyncutil.eraseResult(exec('pbcopy', ''));
	}
}

export function createPlatformClipboard(): Clipboard {
	if (os.type() == 'Linux' && process.env.DISPLAY) {
		return new X11Clipboard();
	} else if (os.type() == 'Darwin') {
		return new MacClipboard();
	} else {
		return new FakeClipboard();
	}
}

