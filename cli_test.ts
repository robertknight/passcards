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
	});
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

testLib.runTests();
