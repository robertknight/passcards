import os = require('os');
import path = require('path');
import Q = require('q');
import underscore = require('underscore');

import asyncutil = require('../lib/asyncutil');
import cli = require('./cli')
import clipboard = require('./clipboard')
import consoleio = require('../lib/console')
import nodefs = require('../lib/nodefs');
import testLib = require('../lib/test')
import onepass = require('../lib/onepass')
import vfs = require('../lib/vfs');

interface PromptReply {
	match: RegExp
	response: string
}

/** Fake terminal input/output implementation which
  * returns canned input and stores 'output' for
  * inspection in tests.
  */
class FakeIO implements consoleio.TermIO {
	output : string[];
	password : string;
	passRequestCount : number;
	replies : PromptReply[];
	
	constructor() {
		this.output = [];
		this.passRequestCount = 0;
		this.replies = [];
	}

	print(text: string) : void {
		this.output.push(text);
	}

	readLine(prompt: string) : Q.Promise<string> {
		var reply = underscore.find(this.replies, (reply) => {
			return prompt.match(reply.match) != null;
		});
		if (reply) {
			return Q.resolve(reply.response);
		} else {
			return Q.reject('No pattern matched the prompt: "' + prompt + '"');
		}
	}

	readPassword(prompt: string) : Q.Promise<string> {
		if (prompt.match('Master password')) {
			++this.passRequestCount;
			return Q.resolve(this.password);
		} else {
			return this.readLine(prompt);
		}
	}

	didPrint(pattern: RegExp) : boolean {
		var match = false;
		this.output.forEach((line) => {
			if (line.match(pattern)) {
				match = true;
			}
		});
		return match;
	}
}

// fake key agent which mirrors the real agent in returning
// results asynchronously - whereas the default SimpleKeyAgent
// implementation updates keys synchronously
class FakeKeyAgent extends onepass.SimpleKeyAgent {

	private delay() : Q.Promise<void> {
		return Q.delay<void>(null, 0);
	}

	addKey(id: string, key: string) : Q.Promise<void> {
		return this.delay().then(() => {
			return super.addKey(id, key);
		});
	}
	
	listKeys() : Q.Promise<string[]> {
		return this.delay().then(() => {
			return super.listKeys();
		});
	}

	forgetKeys() : Q.Promise<void> {
		return this.delay().then(() => {
			return super.forgetKeys();
		});
	}

	decrypt(id: string, cipherText: string, params: onepass.CryptoParams) : Q.Promise<string> {
		return this.delay().then(() => {
			return super.decrypt(id, cipherText, params);
		});
	}

	encrypt(id: string, plainText: string, params: onepass.CryptoParams) : Q.Promise<string> {
		return this.delay().then(() => {
			return super.encrypt(id, plainText, params);
		});
	}
}

var TEST_VAULT_PATH = 'lib/test-data/test.agilekeychain';
var fakeTerm = new FakeIO();
fakeTerm.password = 'logMEin';

var keyAgent = new FakeKeyAgent();
var fakeClipboard = new clipboard.FakeClipboard();

var app = new cli.CLI(fakeTerm, keyAgent, fakeClipboard);
var stdArgs = ['--vault', TEST_VAULT_PATH];

function runCLI(...args: any[]) : Q.Promise<number> {
	return app.exec(stdArgs.concat(args));
}

function runCLIWithVault(path: string, ...args: any[]) : Q.Promise<number> {
	return app.exec(['--vault', path].concat(args));
}

function cloneTestVault() : Q.Promise<string> {
	var fs = new nodefs.FileVFS('/');
	var tempPath = path.join(<string>(<any>os).tmpdir(), 'test-vault');
	return vfs.VFSUtil.rmrf(fs, tempPath).then(() => {
		return fs.stat(path.resolve(TEST_VAULT_PATH));
	}).then((srcFolder) => {
		return vfs.VFSUtil.cp(fs, srcFolder, tempPath);
	}).then(() => {
		return tempPath;
	});
}

testLib.addAsyncTest('list vault', (assert) => {
	runCLI('list')
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(fakeTerm.didPrint(/Facebook.*Login/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('wrong password', (assert) => {
	var term = new FakeIO();
	term.password = 'wrong-password';
	var app = new cli.CLI(term);
	app.exec(stdArgs.concat(['list']))
	.then((status) => {
		assert.equal(status, 2);
		assert.ok(term.didPrint(/Unlocking failed/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('show item', (assert) => {
	runCLI('show', 'facebook')
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(fakeTerm.didPrint(/username.*john\.doe@gmail.com/));
		assert.ok(fakeTerm.didPrint(/password.*Wwk-ZWc-T9MO/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('show overview', (assert) => {
	runCLI('show-overview', 'facebook')
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(fakeTerm.didPrint(/Facebook.*Login/));
		assert.ok(fakeTerm.didPrint(/ID: CA20BB325873446966ED1F4E641B5A36/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('lock', (assert) => {
	fakeTerm.passRequestCount = 0;

	keyAgent.forgetKeys().then(() => {
		return runCLI('show', 'facebook')
	}).then((status) => {
		assert.equal(status, 0);
		assert.equal(fakeTerm.passRequestCount, 1);
		assert.equal(keyAgent.keyCount(), 1);
		return runCLI('lock')
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(keyAgent.keyCount(), 0);
		return runCLI('show', 'facebook')
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(keyAgent.keyCount(), 1);
		assert.equal(fakeTerm.passRequestCount, 2);
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('copy', (assert) => {
	runCLI('copy', 'facebook')
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(fakeClipboard.data, 'Wwk-ZWc-T9MO');
		return runCLI('copy', 'facebook', 'user');
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(fakeClipboard.data, 'john.doe@gmail.com');
		return runCLI('copy', 'facebook', 'web');
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(fakeClipboard.data, 'facebook.com');
		return runCLI('copy', 'facebook', 'no-such-field');
	})
	.then((status) => {
		assert.equal(status, 1);
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('add login', (assert) => {
	fakeTerm.replies = fakeTerm.replies.concat([{
		match: /Website/,
		response: 'mydomain.com'
	},{
		match: /Username/,
		response: 'jim.smith@gmail.com'
	},{
		match: /Password/,
		response: 'testpass'
	},{
		match: /Re-enter/,
		response: 'testpass'
	}]);

	var vaultPath : string;
	cloneTestVault().then((path) => {
		vaultPath = path;
		return runCLIWithVault(path, 'add', 'login', 'MyDomain')
	}).then((status) => {
		assert.equal(status, 0);
		return runCLIWithVault(vaultPath, 'show', 'mydomain');
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(fakeTerm.didPrint(/mydomain.com/));
		assert.ok(fakeTerm.didPrint(/testpass/));
		assert.ok(fakeTerm.didPrint(/jim\.smith@gmail\.com/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('trash/restore item', (assert) => {
	var vaultPath : string;
	cloneTestVault().then((path) => {
		vaultPath = path;
		return runCLIWithVault(path, 'trash', 'facebook');
	}).then((status) => {
		assert.equal(status, 0);
		return runCLIWithVault(vaultPath, 'show', 'facebook');
	}).then((status) => {
		assert.equal(status, 0);
		assert.ok(fakeTerm.didPrint(/In Trash: Yes/));
		return runCLIWithVault(vaultPath, 'restore', 'facebook');
	}).then((status) => {
		assert.equal(status, 0);
		fakeTerm.output = [];
		return runCLIWithVault(vaultPath, 'show', 'facebook');
	}).then((status) => {
		assert.equal(status, 0);
		assert.ok(!fakeTerm.didPrint(/In Trash/));

		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('change password', (assert) => {
	fakeTerm.replies = fakeTerm.replies.concat([{
		match: /Re-enter existing/,
		response: 'logMEin'
	},{
		match: /New password/,
		response: 'newpass'
	},{
		match: /Re-enter new/,
		response: 'newpass'
	},{
		match: /Hint for new/,
		response: 'the-hint'
	}]);

	var vaultPath : string;
	cloneTestVault().then((path) => {
		vaultPath = path;
		return runCLIWithVault(path, 'set-password');
	}).then((status) => {
		assert.equal(status, 0);
		return runCLIWithVault(vaultPath, 'lock');
	}).then((status) => {
		assert.equal(status, 0);
		fakeTerm.password = 'newpass';
		return runCLIWithVault(vaultPath, 'list');
	}).then((status) => {
		assert.equal(status, 0);

		fakeTerm.password = 'logMEin';
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('item pattern formats', (assert) => {
	var patterns = ['facebook', 'FACEB', 'ca20', 'CA20'];
	var tests: Array<() => Q.Promise<any>> = [];

	patterns.forEach((pattern, index) => {
		tests.push(() => {
			return runCLI('show', pattern)
			.then((status) => {
				assert.equal(status, 0);
				assert.ok(fakeTerm.didPrint(/Facebook.*Login/));
				return true;
			});
		});
	});

	asyncutil.runSequence(tests).then(() => {
		testLib.continueTests();
	});
});

testLib.runTests();
