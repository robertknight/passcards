import os = require('os');
import path = require('path');
import Q = require('q');
import underscore = require('underscore');

import asyncutil = require('../lib/base/asyncutil');
import cli = require('./cli')
import clipboard = require('./clipboard')
import consoleio = require('./console')
import key_agent = require('../lib/key_agent');
import nodefs = require('../lib/vfs/node');
import testLib = require('../lib/test')
import vfs_util = require('../lib/vfs/util');

interface PromptReply {
	match: RegExp
	response: string
}

/** Fake terminal input/output implementation which
  * returns canned input and stores 'output' for
  * inspection in tests.
  */
class FakeIO implements consoleio.TermIO {
	output: string[];
	password: string;
	passRequestCount: number;
	replies: PromptReply[];

	constructor() {
		this.output = [];
		this.passRequestCount = 0;
		this.replies = [];
	}

	print(text: string): void {
		this.output.push(text);
	}

	readLine(prompt: string): Q.Promise<string> {
		var reply = underscore.find(this.replies, (reply) => {
			return prompt.match(reply.match) != null;
		});
		if (reply) {
			return Q(reply.response);
		} else {
			return Q.reject<string>('No pattern matched the prompt: "' + prompt + '"');
		}
	}

	readPassword(prompt: string): Q.Promise<string> {
		if (prompt.match('Master password')) {
			++this.passRequestCount;
			return Q(this.password);
		} else {
			return this.readLine(prompt);
		}
	}

	didPrint(pattern: RegExp): boolean {
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
class FakeKeyAgent extends key_agent.SimpleKeyAgent {

	private delay(): Q.Promise<void> {
		return Q.delay<void>(null, 0);
	}

	addKey(id: string, key: string): Q.Promise<void> {
		return this.delay().then(() => {
			return super.addKey(id, key);
		});
	}

	listKeys(): Q.Promise<string[]> {
		return this.delay().then(() => {
			return super.listKeys();
		});
	}

	forgetKeys(): Q.Promise<void> {
		return this.delay().then(() => {
			return super.forgetKeys();
		});
	}

	decrypt(id: string, cipherText: string, params: key_agent.CryptoParams): Q.Promise<string> {
		return this.delay().then(() => {
			return super.decrypt(id, cipherText, params);
		});
	}

	encrypt(id: string, plainText: string, params: key_agent.CryptoParams): Q.Promise<string> {
		return this.delay().then(() => {
			return super.encrypt(id, plainText, params);
		});
	}
}

// utility class for specifying responses to CLI
// prompts
class PromptMatcher {
	private replies: PromptReply[];
	private query: RegExp;

	constructor(replies: PromptReply[], query: RegExp) {
		this.replies = replies;
		this.query = query;
	}

	with(response: string) {
		this.replies.push({
			match: this.query,
			response: response
		});
	}
}

var TEST_VAULT_PATH = 'lib/test-data/test.agilekeychain';

function cloneVault(vaultPath: string): Q.Promise<string> {
	var fs = new nodefs.FileVFS('/');
	var tempPath = path.join(<string>(<any>os).tmpdir(), 'test-vault');
	return vfs_util.rmrf(fs, tempPath).then(() => {
		return fs.stat(path.resolve(vaultPath));
	}).then((srcFolder) => {
		return vfs_util.cp(fs, srcFolder, tempPath);
	}).then(() => {
		return tempPath;
	});
}

/** CLITest sets up an environment for a CLI test,
  * including a cli.CLI instance with a fake console. clipboard
  * and key agent.
  *
  * By default the test uses a shared read-only test vault.
  * Use newVault() to create a copy of this if the test needs
  * to modify items in the vault.
  */
class CLITest {
	fakeTerm: FakeIO;
	keyAgent: FakeKeyAgent;
	fakeClipboard: clipboard.FakeClipboard;

	private app: cli.CLI;
	private assert: testLib.Assert;
	private vaultPath: string;

	constructor(assert: testLib.Assert) {
		this.fakeClipboard = new clipboard.FakeClipboard();
		this.fakeTerm = new FakeIO();
		this.fakeTerm.password = 'logMEin';
		this.keyAgent = new FakeKeyAgent();
		this.app = new cli.CLI(this.fakeTerm, this.keyAgent, this.fakeClipboard);
		this.assert = assert;
		this.vaultPath = TEST_VAULT_PATH;
	}

	setVaultPath(path: string) {
		this.vaultPath = path;
	}

	/** Create a new writable vault for testing. Subsequent run() calls
	  * will use this vault.
	  */
	newVault(): Q.Promise<string> {
		return cloneVault(TEST_VAULT_PATH).then((path) => {
			this.vaultPath = path;
			return path;
		});
	}

	/** Run a CLI command, expecting it to exit successfully. */
	run(...args: string[]): Q.Promise<number> {
		return this.runExpectingStatus.apply(this,(<any>[0]).concat(args));
	}

	/** Run a CLI command, expecting a given exit status */
	runExpectingStatus(expectedStatus: number, ...args: string[]): Q.Promise<number> {
		var vaultArgs = ['--vault', this.vaultPath];
		return this.app.exec(vaultArgs.concat(args)).then((status) => {
			if (status != expectedStatus) {
				console.log(args.join(' ') + ' FAILED');
				console.log('>>> CLI OUTPUT');
				console.log(this.fakeTerm.output.join('\n'));
				console.log('<<<');
			}
			this.assert.equal(status, expectedStatus);
			return status;
		});
	}

	/** Create a matcher to set a canned reply to prompts from
	  * the CLI matching @p query
	  */
	replyTo(query: RegExp): PromptMatcher {
		return new PromptMatcher(this.fakeTerm.replies, query);
	}
}

testLib.addAsyncTest('list vault', (assert) => {
	var env = new CLITest(assert);
	return env.run('list')
	.then(() => {
		assert.ok(env.fakeTerm.didPrint(/Facebook.*Login/));
	});
});

testLib.addAsyncTest('list vault with pattern', (assert) => {
	var env = new CLITest(assert);
	return env.run('list', '-p', 'nomatch')
	.then(() => {
		assert.ok(env.fakeTerm.didPrint(/0 matching item/));
		return env.run('list', '-p', 'face');
	})
	.then(() => {
		assert.ok(env.fakeTerm.didPrint(/1 matching item/));
		assert.ok(env.fakeTerm.didPrint(/Facebook.*Login/));
	});
});

testLib.addAsyncTest('wrong password', (assert) => {
	var env = new CLITest(assert);
	env.fakeTerm.password = 'wrong-password';
	return env.runExpectingStatus(2, 'list')
	.then(() => {
		assert.ok(env.fakeTerm.didPrint(/Unlocking failed/));
	});
});

testLib.addAsyncTest('show item', (assert) => {
	var env = new CLITest(assert);
	return env.run('show', 'facebook')
	.then(() => {
		assert.ok(env.fakeTerm.didPrint(/username.*john\.doe@gmail.com/));
		assert.ok(env.fakeTerm.didPrint(/password.*Wwk-ZWc-T9MO/));
	});
});

testLib.addAsyncTest('show overview', (assert) => {
	var env = new CLITest(assert);
	return env.run('show', '--format=overview', 'facebook')
	.then(() => {
		assert.ok(env.fakeTerm.didPrint(/Facebook.*Login/));
		assert.ok(env.fakeTerm.didPrint(/ID: CA20BB325873446966ED1F4E641B5A36/));
	});
});

testLib.addAsyncTest('show JSON', (assert) => {
	var env = new CLITest(assert);
	return env.run('show', '--format=json', 'facebook')
	.then(() => {
		assert.ok(env.fakeTerm.didPrint(/URLs/));
		assert.ok(env.fakeTerm.didPrint(/"type": "T"/));
	});
});

testLib.addAsyncTest('lock', (assert) => {
	var env = new CLITest(assert);
	env.fakeTerm.passRequestCount = 0;

	return env.keyAgent.forgetKeys().then(() => {
		return env.run('show', 'facebook')
	}).then(() => {
		assert.equal(env.fakeTerm.passRequestCount, 1);
		assert.equal(env.keyAgent.keyCount(), 1);
		return env.run('lock')
	})
	.then(() => {
		assert.equal(env.keyAgent.keyCount(), 0);
		return env.run('show', 'facebook')
	})
	.then(() => {
		assert.equal(env.keyAgent.keyCount(), 1);
		assert.equal(env.fakeTerm.passRequestCount, 2);
	});
});

testLib.addAsyncTest('copy', (assert) => {
	var env = new CLITest(assert);
	return env.run('copy', 'facebook')
	.then(() => {
		assert.equal(env.fakeClipboard.data, 'Wwk-ZWc-T9MO');
		return env.run('copy', 'facebook', 'user');
	})
	.then(() => {
		assert.equal(env.fakeClipboard.data, 'john.doe@gmail.com');
		return env.run('copy', 'facebook', 'web');
	})
	.then(() => {
		assert.equal(env.fakeClipboard.data, 'facebook.com');
		return env.runExpectingStatus(1, 'copy', 'facebook', 'no-such-field');
	});
});

testLib.addAsyncTest('select matching item', (assert) => {
	var env = new CLITest(assert);
	env.replyTo(/Website/).with('facebook.com');
	env.replyTo(/Username/).with('jane.smith@gmail.com');
	env.replyTo(/Password/).with('jane');
	env.replyTo(/Re-enter/).with('jane');
	env.replyTo(/Select Item/).with('2');

	return env.newVault().then(() => {
		// add a second Facebook account to the vault
		return env.run('add', 'login', 'Facebook (Jane)');
	}).then(() => {
		// copy an item from the vault. Since there are multiple items
		// matching the pattern, the CLI will prompt to select one
		return env.run('copy', 'facebook');
	}).then(() => {
		// check that the password for the right item was copied
		assert.equal(env.fakeClipboard.data, 'jane');
	});
});

testLib.addAsyncTest('add login', (assert) => {
	var env = new CLITest(assert);
	env.replyTo(/Website/).with('mydomain.com');
	env.replyTo(/Username/).with('jim.smith@gmail.com');
	env.replyTo(/Password/).with('testpass');
	env.replyTo(/Re-enter/).with('testpass');

	return env.newVault().then(() => {
		return env.run('add', 'login', 'MyDomain')
	}).then(() => {
		return env.run('show', 'mydomain');
	})
	.then(() => {
		assert.ok(env.fakeTerm.didPrint(/mydomain.com/));
		assert.ok(env.fakeTerm.didPrint(/testpass/));
		assert.ok(env.fakeTerm.didPrint(/jim\.smith@gmail\.com/));
	});
});

testLib.addAsyncTest('add credit card', (assert) => {
	var env = new CLITest(assert);
	return env.newVault().then(() => {
		return env.run('add', 'card', 'MasterCard');
	}).then(() => {
		return env.run('show', 'master');
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/MasterCard \(Credit Card\)/));
	});
});

testLib.addAsyncTest('trash/restore item', (assert) => {
	var env = new CLITest(assert);
	return env.newVault().then(() => {
		return env.run('trash', 'facebook');
	}).then(() => {
		return env.run('show', 'facebook');
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/In Trash: Yes/));
		return env.run('restore', 'facebook');
	}).then(() => {
		env.fakeTerm.output = [];
		return env.run('show', 'facebook');
	}).then(() => {
		assert.ok(!env.fakeTerm.didPrint(/In Trash/));
	});
});

testLib.addAsyncTest('change password', (assert) => {
	var env = new CLITest(assert);
	env.replyTo(/Re-enter existing/).with('logMEin');
	env.replyTo(/New password/).with('newpass');
	env.replyTo(/Re-enter new/).with('newpass');
	env.replyTo(/Hint for new/).with('the-hint');

	return env.newVault().then(() => {
		return env.run('set-password');
	}).then(() => {
		return env.run('lock');
	}).then(() => {
		env.fakeTerm.password = 'newpass';
		return env.run('list');
	});
});

testLib.addAsyncTest('item pattern formats', (assert) => {
	var env = new CLITest(assert);
	var patterns = ['facebook', 'FACEB', 'ca20', 'CA20'];
	var tests: Array<() => Q.Promise<any>> = [];

	patterns.forEach((pattern, index) => {
		tests.push(() => {
			return env.run('show', pattern)
			.then(() => {
				assert.ok(env.fakeTerm.didPrint(/Facebook.*Login/));
				return true;
			});
		});
	});

	return asyncutil.series(tests);
});

testLib.addAsyncTest('remove items', (assert) => {
	var env = new CLITest(assert);
	env.replyTo(/Do you really want to remove these 1 item\(s\)/).with('y');

	return env.newVault().then(() => {
		return env.run('remove', 'faceb');
	}).then(() => {
		return env.run('list');
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/0 matching item\(s\)/));
	});
});

testLib.addAsyncTest('generate password', (assert) => {
	var env = new CLITest(assert);
	return env.run('gen-password').then((status) => {
		assert.ok(env.fakeTerm.didPrint(/[A-Za-z0-9]{3}-[A-Za-z0-9]{3}-[A-Za-z0-9]{4}/));
	});
});

testLib.addAsyncTest('edit item - set field', (assert) => {
	var env = new CLITest(assert);

	env.replyTo(/New value for "username"/).with('newuser');
	env.replyTo(/Password \(or/).with('newpass');
	env.replyTo(/Re-enter/).with('newpass');

	return env.newVault().then(() => {
		return env.run('edit', 'faceb', 'set-field', 'pass');
	}).then(() => {
		return env.run('edit', 'faceb', 'set-field', 'user');
	}).then(() => {
		return env.run('show', 'faceb');
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/username.*newuser/));
		assert.ok(env.fakeTerm.didPrint(/password.*newpass/));
	});
});

testLib.addAsyncTest('edit item - add section and field', (assert) => {
	var env = new CLITest(assert);

	return env.newVault().then(() => {
		return env.run('edit', 'faceb', 'add-section', 'NewSection');
	}).then(() => {
		return env.run('edit', 'faceb', 'add-field', 'newsection', 'customfield', 'customvalue');
	}).then(() => {
		return env.run('show', 'faceb');
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/NewSection/));
		assert.ok(env.fakeTerm.didPrint(/customfield.*customvalue/));
	});
});

testLib.addAsyncTest('edit item - remove field', (assert) => {
	var env = new CLITest(assert);
	return env.newVault().then(() => {
		return env.run('edit', 'faceb', 'add-section', 'NewSection');
	}).then(() => {
		return env.run('edit', 'faceb', 'add-field', 'newsection', 'customfield', 'customvalue');
	}).then(() => {
		return env.run('edit', 'faceb', 'remove-field', 'customfield');
	}).then(() => {
		return env.run('show', 'faceb');
	}).then(() => {
		assert.ok(!env.fakeTerm.didPrint(/customfield/));
	});
});

testLib.addAsyncTest('create new vault', (assert) => {
	var env = new CLITest(assert);
	env.replyTo(/New password/).with('vaultpass');
	env.replyTo(/Re-enter new/).with('vaultpass');
	env.replyTo(/Hint for new/).with('vault pass hint');

	var newVaultPath = path.join(<string>(<any>os).tmpdir(), 'new-vault');

	var fs = new nodefs.FileVFS('/');
	return vfs_util.rmrf(fs, newVaultPath + '.agilekeychain').then(() => {
		return env.run('new-vault', '--iterations', '100', newVaultPath);
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/New vault created/));

		// A '.agilekeychain' suffix is added to the end of the path if
		// not specified on the command line
		env.setVaultPath(newVaultPath + '.agilekeychain');
		env.fakeTerm.password = 'vaultpass';
		return env.run('list');
	}).then(() => {
		env.replyTo(/Website/).with('google.com');
		env.replyTo(/Username/).with('john.doe@gmail.com');
		env.replyTo(/Password/).with('-');

		assert.ok(env.fakeTerm.didPrint(/0 matching/));
		return env.run('add', 'login', 'google.com');
	}).then(() => {
		return env.run('show', 'google');
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/john\.doe/));
	});
});

testLib.addAsyncTest('create new vault with relative path', (assert) => {
	var env = new CLITest(assert);
	env.replyTo(/New password/).with('vaultpass');
	env.replyTo(/Re-enter new/).with('vaultpass');
	env.replyTo(/Hint for new/).with('vaultpass');

	var relativePath = 'newvault';
	return env.run('new-vault', '--iterations', '100', relativePath).then(() => {
		assert.ok(env.fakeTerm.didPrint(/New vault created/));

		var fs = new nodefs.FileVFS('/');
		return vfs_util.rmrf(fs, path.resolve(relativePath + '.agilekeychain'));
	});
});

testLib.addAsyncTest('repair items', (assert) => {
	// This runs the 'repair' command in a vault where all
	// items are valid. We should also check that it behaves
	// as expected when there are items that do need to be
	// repaired.

	var env = new CLITest(assert);
	return env.newVault().then(() => {
		return env.run('repair')
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/Checking 1 items/));
	});
});

testLib.addAsyncTest('edit item - rename', (assert) => {
	var env = new CLITest(assert);

	return env.newVault().then(() => {
		return env.run('edit', 'facebook', 'rename', 'newtitle');
	}).then(() => {
		return env.run('show', 'newtitle');
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/username.*john\.doe@gmail.com/));
	});
});

testLib.addAsyncTest('edit item - rename with empty title', (assert) => {
	var env = new CLITest(assert);

	return env.newVault().then(() => {
		return env.runExpectingStatus(1, 'edit', 'facebook', 'rename', ' ');
	}).then(() => {
		assert.ok(env.fakeTerm.didPrint(/New item name must not be empty/));
	});
});

testLib.start();
