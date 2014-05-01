import cli = require('./cli')
import consoleio = require('./lib/console')
import testLib = require('./lib/test')

var TEST_VAULT_PATH = 'lib/test-data/test.agilekeychain';
var fakeTerm = new consoleio.FakeIO();
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
	var term = new consoleio.FakeIO();
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

testLib.runTests();
