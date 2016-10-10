import child_process = require('child_process');
import os = require('os');

import asyncutil = require('../lib/base/asyncutil');
import { defer } from '../lib/base/promise_util';

export interface Clipboard {
	setData(content: string): Promise<void>;
	getData(): Promise<string>;
	clear(): Promise<void>;
}

export class FakeClipboard implements Clipboard {
	data: string

	constructor() {
		this.data = '';
	}

	setData(content: string): Promise<void> {
		this.data = content;
		return Promise.resolve<void>(null);
	}

	getData(): Promise<string> {
		return Promise.resolve(this.data);
	}

	clear(): Promise<void> {
		this.data = '';
		return Promise.resolve<void>(null);
	}
}

// run an external command, feeding it 'input' if non-null and return
// a promise for the output
function exec(command: string, input?: string): Promise<string> {
	var stdout = defer<string>();
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

	setData(content: string): Promise<void> {
		return asyncutil.eraseResult(exec('xsel --clipboard --input', content));
	}

	getData(): Promise<string> {
		return exec('xsel --clipboard --output');
	}

	clear(): Promise<void> {
		return asyncutil.eraseResult(exec('xsel --clipboard --clear'));
	}
}

export class MacClipboard implements Clipboard {
	setData(content: string): Promise<void> {
		return asyncutil.eraseResult(exec('pbcopy', content));
	}

	getData(): Promise<string> {
		return exec('pbpaste');
	}

	clear(): Promise<void> {
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
