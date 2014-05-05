import Q = require('q');

import cli = require('./cli')
import consoleio = require('../lib/console')
import testLib = require('../lib/test')

/** Fake terminal input/output implementation which
  * returns canned input and stores 'output' for
  * inspection in tests.
  */
export class FakeIO implements consoleio.TermIO {
	output : string[];
	password : string;
	passRequestCount : number;

	constructor() {
		this.output = [];
		this.passRequestCount = 0;
	}

	print(text: string) : void {
		this.output.push(text);
	}

	/** Returns a canned password. */
	readPassword(prompt: string) : Q.Promise<string> {
		++this.passRequestCount;
		return Q.resolve(this.password);
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

var app = new cli.CLI(fakeTerm);
var stdArgs = ['--vault', TEST_VAULT_PATH];

testLib.addAsyncTest('list vault', (assert) => {
	app.exec(stdArgs.concat(['list']))
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
	app.exec(stdArgs.concat(['show', 'facebook']))
	.then((status) => {
		assert.equal(status, 0);
		assert.ok(fakeTerm.didPrint(/username.*john\.doe@gmail.com/));
		assert.ok(fakeTerm.didPrint(/password.*Wwk-ZWc-T9MO/));
		testLib.continueTests();
	})
	.done();
});

testLib.addAsyncTest('show overview', (assert) => {
	app.exec(stdArgs.concat(['show-overview', 'facebook']))
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

	app.exec(stdArgs.concat(['show', 'facebook']))
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(fakeTerm.passRequestCount, 1);
		return app.exec(stdArgs.concat(['lock']));
	})
	.then((status) => {
		assert.equal(status, 0);
		return app.exec(stdArgs.concat(['show', 'facebook']));
	})
	.then((status) => {
		assert.equal(status, 0);
		assert.equal(fakeTerm.passRequestCount, 2);
		testLib.continueTests();
	})
	.done();
});

testLib.runTests();
