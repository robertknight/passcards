import Q = require('q');
import underscore = require('underscore');

import cli = require('./cli')
import clipboard = require('./clipboard')
import consoleio = require('../lib/console')
import testLib = require('../lib/test')
import onepass = require('../lib/onepass')

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

var TEST_VAULT_PATH = 'lib/test-data/test.agilekeychain';
var fakeTerm = new FakeIO();
fakeTerm.password = 'logMEin';

var keyAgent = new onepass.SimpleKeyAgent();
var fakeClipboard = new clipboard.FakeClipboard();

var app = new cli.CLI(fakeTerm, keyAgent, fakeClipboard);
var stdArgs = ['--vault', TEST_VAULT_PATH];

function runCLI(...args: any[]) : Q.Promise<number> {
	return app.exec(stdArgs.concat(args));
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
		return runCLI('lock')
	})
	.then((status) => {
		assert.equal(status, 0);
		return runCLI('show', 'facebook')
	})
	.then((status) => {
		assert.equal(status, 0);
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
	runCLI('add', 'login', 'MyDomain')
	.then((status) => {
		assert.equal(status, 0);
		return runCLI('show', 'mydomain');
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

testLib.runTests();
