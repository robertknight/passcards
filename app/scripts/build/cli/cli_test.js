var Q = require('q');

var cli = require('./cli');
var clipboard = require('./clipboard');

var testLib = require('../lib/test');
var onepass = require('../lib/onepass');

/** Fake terminal input/output implementation which
* returns canned input and stores 'output' for
* inspection in tests.
*/
var FakeIO = (function () {
    function FakeIO() {
        this.output = [];
        this.passRequestCount = 0;
    }
    FakeIO.prototype.print = function (text) {
        this.output.push(text);
    };

    /** Returns a canned password. */
    FakeIO.prototype.readPassword = function (prompt) {
        ++this.passRequestCount;
        return Q.resolve(this.password);
    };

    FakeIO.prototype.didPrint = function (pattern) {
        var match = false;
        this.output.forEach(function (line) {
            if (line.match(pattern)) {
                match = true;
            }
        });
        return match;
    };
    return FakeIO;
})();
exports.FakeIO = FakeIO;

var TEST_VAULT_PATH = 'lib/test-data/test.agilekeychain';
var fakeTerm = new FakeIO();
fakeTerm.password = 'logMEin';

var keyAgent = new onepass.SimpleKeyAgent();
var fakeClipboard = new clipboard.FakeClipboard();

var app = new cli.CLI(fakeTerm, keyAgent, fakeClipboard);
var stdArgs = ['--vault', TEST_VAULT_PATH];

function runCLI() {
    var args = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        args[_i] = arguments[_i + 0];
    }
    return app.exec(stdArgs.concat(args));
}

testLib.addAsyncTest('list vault', function (assert) {
    runCLI('list').then(function (status) {
        assert.equal(status, 0);
        assert.ok(fakeTerm.didPrint(/Facebook.*Login/));
        testLib.continueTests();
    }).done();
});

testLib.addAsyncTest('wrong password', function (assert) {
    var term = new FakeIO();
    term.password = 'wrong-password';
    var app = new cli.CLI(term);
    app.exec(stdArgs.concat(['list'])).then(function (status) {
        assert.equal(status, 2);
        assert.ok(term.didPrint(/Unlocking failed/));
        testLib.continueTests();
    }).done();
});

testLib.addAsyncTest('show item', function (assert) {
    runCLI('show', 'facebook').then(function (status) {
        assert.equal(status, 0);
        assert.ok(fakeTerm.didPrint(/username.*john\.doe@gmail.com/));
        assert.ok(fakeTerm.didPrint(/password.*Wwk-ZWc-T9MO/));
        testLib.continueTests();
    }).done();
});

testLib.addAsyncTest('show overview', function (assert) {
    runCLI('show-overview', 'facebook').then(function (status) {
        assert.equal(status, 0);
        assert.ok(fakeTerm.didPrint(/Facebook.*Login/));
        assert.ok(fakeTerm.didPrint(/ID: CA20BB325873446966ED1F4E641B5A36/));
        testLib.continueTests();
    }).done();
});

testLib.addAsyncTest('lock', function (assert) {
    fakeTerm.passRequestCount = 0;

    keyAgent.forgetKeys().then(function () {
        return runCLI('show', 'facebook');
    }).then(function (status) {
        assert.equal(status, 0);
        assert.equal(fakeTerm.passRequestCount, 1);
        return runCLI('lock');
    }).then(function (status) {
        assert.equal(status, 0);
        return runCLI('show', 'facebook');
    }).then(function (status) {
        assert.equal(status, 0);
        assert.equal(fakeTerm.passRequestCount, 2);
        testLib.continueTests();
    }).done();
});

testLib.addAsyncTest('copy', function (assert) {
    runCLI('copy', 'facebook').then(function (status) {
        assert.equal(status, 0);
        assert.equal(fakeClipboard.data, 'Wwk-ZWc-T9MO');
        return runCLI('copy', 'facebook', 'user');
    }).then(function (status) {
        assert.equal(status, 0);
        assert.equal(fakeClipboard.data, 'john.doe@gmail.com');
        return runCLI('copy', 'facebook', 'web');
    }).then(function (status) {
        assert.equal(status, 0);
        assert.equal(fakeClipboard.data, 'facebook.com');
        return runCLI('copy', 'facebook', 'no-such-field');
    }).then(function (status) {
        assert.equal(status, 1);
        testLib.continueTests();
    }).done();
});

testLib.runTests();
//# sourceMappingURL=cli_test.js.map
