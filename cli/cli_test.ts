import os = require('os');
import path = require('path');
import Q = require('q');
import underscore = require('underscore');

import asyncutil = require('../lib/base/asyncutil');
import cli = require('./cli')
import clipboard = require('./clipboard')
import consoleio = require('../lib/console')
import nodefs = require('../lib/vfs/node');
import testLib = require('../lib/test')
import onepass = require('../lib/onepass')
import vfs = require('../lib/vfs/vfs');

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
var stdArgs = ['--vault', TEST_VAULT_PATH];

class CLITest {
	fakeTerm : FakeIO;
	keyAgent : FakeKeyAgent;
	fakeClipboard : clipboard.FakeClipboard;
	app : cli.CLI;

	constructor() {
		this.fakeClipboard = new clipboard.FakeClipboard();
		this.fakeTerm = new FakeIO();
		this.fakeTerm.password = 'logMEin';
		this.keyAgent = new FakeKeyAgent();
		this.app = new cli.CLI(this.fakeTerm, this.keyAgent, this.fakeClipboard);
	}

	runCLI(...args: any[]) : Q.Promise<number> {
		return this.app.exec(stdArgs.concat(args));
	}

	runCLIWithVault(path: string, ...args: any[]) : Q.Promise<number> {
		return this.app.exec(['--vault', path].concat(args));
	}
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
	var env = new CLITest();
	env.runCLI('list')
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(env.fakeTerm.didPrint(/Facebook.*Login/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('list vault with pattern', (assert) => {
	var env = new CLITest();
	env.runCLI('list', '-p', 'nomatch')
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(env.fakeTerm.didPrint(/0 matching item/));
		return env.runCLI('list', '-p', 'face');
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(env.fakeTerm.didPrint(/1 matching item/));
		assert.ok(env.fakeTerm.didPrint(/Facebook.*Login/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('wrong password', (assert) => {
	var env = new CLITest();
	env.fakeTerm.password = 'wrong-password';
	env.runCLI('list')
	.then((status) => {
		assert.equal(status, 2);
		assert.ok(env.fakeTerm.didPrint(/Unlocking failed/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('show item', (assert) => {
	var env = new CLITest();
	env.runCLI('show', 'facebook')
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(env.fakeTerm.didPrint(/username.*john\.doe@gmail.com/));
		assert.ok(env.fakeTerm.didPrint(/password.*Wwk-ZWc-T9MO/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('show overview', (assert) => {
	var env = new CLITest();
	env.runCLI('show-overview', 'facebook')
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(env.fakeTerm.didPrint(/Facebook.*Login/));
		assert.ok(env.fakeTerm.didPrint(/ID: CA20BB325873446966ED1F4E641B5A36/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('lock', (assert) => {
	var env = new CLITest();
	env.fakeTerm.passRequestCount = 0;

	env.keyAgent.forgetKeys().then(() => {
		return env.runCLI('show', 'facebook')
	}).then((status) => {
		assert.equal(status, 0);
		assert.equal(env.fakeTerm.passRequestCount, 1);
		assert.equal(env.keyAgent.keyCount(), 1);
		return env.runCLI('lock')
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(env.keyAgent.keyCount(), 0);
		return env.runCLI('show', 'facebook')
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(env.keyAgent.keyCount(), 1);
		assert.equal(env.fakeTerm.passRequestCount, 2);
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('copy', (assert) => {
	var env = new CLITest();
	env.runCLI('copy', 'facebook')
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(env.fakeClipboard.data, 'Wwk-ZWc-T9MO');
		return env.runCLI('copy', 'facebook', 'user');
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(env.fakeClipboard.data, 'john.doe@gmail.com');
		return env.runCLI('copy', 'facebook', 'web');
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(env.fakeClipboard.data, 'facebook.com');
		return env.runCLI('copy', 'facebook', 'no-such-field');
	})
	.then((status) => {
		assert.equal(status, 1);
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('select matching item', (assert) => {
	var env = new CLITest();
	env.fakeTerm.replies = env.fakeTerm.replies.concat([{
		match: /Website/,
		response: 'facebook.com'
	},{
		match: /Username/,
		response: 'jane.smith@gmail.com'
	},{
		match: /Password/,
		response: 'jane',
	},{
		match: /Re-enter/,
		response: 'jane'
	},{
		match: /Select Item/,
		response: '2'
	}]);

	var vaultPath : string;
	cloneTestVault().then((path) => {
		vaultPath = path;

		// add a second Facebook account to the vault
		return env.runCLIWithVault(path, 'add', 'login', 'Facebook (Jane)');
	}).then((status) => {
		assert.equal(status, 0);

		// copy an item from the vault. Since there are multiple items
		// matching the pattern, the CLI will prompt to select one
		return env.runCLIWithVault(vaultPath, 'copy', 'facebook');
	}).then((status) => {
		// check that the password for the right item was copied
		assert.equal(status, 0);
		assert.equal(env.fakeClipboard.data, 'jane');

		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('add login', (assert) => {
	var env = new CLITest();
	env.fakeTerm.replies = env.fakeTerm.replies.concat([{
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
		return env.runCLIWithVault(path, 'add', 'login', 'MyDomain')
	}).then((status) => {
		assert.equal(status, 0);
		return env.runCLIWithVault(vaultPath, 'show', 'mydomain');
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(env.fakeTerm.didPrint(/mydomain.com/));
		assert.ok(env.fakeTerm.didPrint(/testpass/));
		assert.ok(env.fakeTerm.didPrint(/jim\.smith@gmail\.com/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('trash/restore item', (assert) => {
	var env = new CLITest();
	var vaultPath : string;
	cloneTestVault().then((path) => {
		vaultPath = path;
		return env.runCLIWithVault(path, 'trash', 'facebook');
	}).then((status) => {
		assert.equal(status, 0);
		return env.runCLIWithVault(vaultPath, 'show', 'facebook');
	}).then((status) => {
		assert.equal(status, 0);
		assert.ok(env.fakeTerm.didPrint(/In Trash: Yes/));
		return env.runCLIWithVault(vaultPath, 'restore', 'facebook');
	}).then((status) => {
		assert.equal(status, 0);
		env.fakeTerm.output = [];
		return env.runCLIWithVault(vaultPath, 'show', 'facebook');
	}).then((status) => {
		assert.equal(status, 0);
		assert.ok(!env.fakeTerm.didPrint(/In Trash/));

		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('change password', (assert) => {
	var env = new CLITest();
	env.fakeTerm.replies = env.fakeTerm.replies.concat([{
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
		return env.runCLIWithVault(path, 'set-password');
	}).then((status) => {
		assert.equal(status, 0);
		return env.runCLIWithVault(vaultPath, 'lock');
	}).then((status) => {
		assert.equal(status, 0);
		env.fakeTerm.password = 'newpass';
		return env.runCLIWithVault(vaultPath, 'list');
	}).then((status) => {
		assert.equal(status, 0);
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('item pattern formats', (assert) => {
	var env = new CLITest();
	var patterns = ['facebook', 'FACEB', 'ca20', 'CA20'];
	var tests: Array<() => Q.Promise<any>> = [];

	patterns.forEach((pattern, index) => {
		tests.push(() => {
			return env.runCLI('show', pattern)
			.then((status) => {
				assert.equal(status, 0);
				assert.ok(env.fakeTerm.didPrint(/Facebook.*Login/));
				return true;
			});
		});
	});

	asyncutil.series(tests).then(() => {
		testLib.continueTests();
	});
});

testLib.addAsyncTest('remove items', (assert) => {
	var env = new CLITest();
	env.fakeTerm.replies.push({
		match: /Do you really want to remove these 1 item\(s\)/,
		response: 'y'
	});

	var vaultPath : string;
	cloneTestVault().then((path) => {
		vaultPath = path;
		return env.runCLIWithVault(vaultPath, 'remove', 'faceb');
	}).then((status) => {
		assert.equal(status, 0);
		return env.runCLIWithVault(vaultPath, 'list');
	}).then((status) => {
		assert.ok(env.fakeTerm.didPrint(/0 matching item\(s\)/));
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('generate password', (assert) => {
	var env = new CLITest();
	env.runCLI('gen-password').then((status) => {
		assert.equal(status, 0);
		assert.ok(env.fakeTerm.didPrint(/[A-Za-z0-9]{3}-[A-Za-z0-9]{3}-[A-Za-z0-9]{4}/));
		testLib.continueTests();
	}).done();
});

testLib.start();
