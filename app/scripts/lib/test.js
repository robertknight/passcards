/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/xdiff.d.ts" />
var qunit = require('qunitjs');
var xdiff = require('xdiff');

var testList = [];

/** Add a test which completes synchronously.
*
* See qunit.test()
*/
function addTest(name, testFunc) {
    testList.push({ name: name, testFunc: testFunc, async: false });
}
exports.addTest = addTest;

/** Add a test which completes asynchronously. @p testFunc must call
* continueTests() once all async operations have completed to signal
* the end of the test.
*
* See qunit.asyncTest()
*/
function addAsyncTest(name, testFunc) {
    testList.push({ name: name, testFunc: testFunc, async: true });
}
exports.addAsyncTest = addAsyncTest;

/** Inform the test runner that an async test has finished. This must be called
* once all async operations in a test added with addAsyncTest() have completed.
*/
function continueTests() {
    qunit.start();
}
exports.continueTests = continueTests;

function beforeTest(func) {
    qunit.testStart(func);
}
exports.beforeTest = beforeTest;

function teardownSuite(func) {
    qunit.done(func);
}
exports.teardownSuite = teardownSuite;

(function (Environment) {
    Environment[Environment["Browser"] = 0] = "Browser";
    Environment[Environment["NodeJS"] = 1] = "NodeJS";
})(exports.Environment || (exports.Environment = {}));
var Environment = exports.Environment;

function environment() {
    if (typeof window == 'undefined') {
        return 1 /* NodeJS */;
    } else {
        return 0 /* Browser */;
    }
}
exports.environment = environment;

/** Run all tests queued with addTest() and addAsyncTest() */
function runTests(filter) {
    if (filter) {
        testList = testList.filter(function (testCase) {
            return testCase.name.indexOf(filter) != -1;
        });
    }

    testList.forEach(function (testCase) {
        if (testCase.async) {
            qunit.asyncTest(testCase.name, testCase.testFunc);
        } else {
            qunit.test(testCase.name, testCase.testFunc);
        }
    });

    qunit.config.testTimeout = 3000;

    qunit.log(function (details) {
        if (!details.result) {
            console.log('test failed');
            console.log(details);
        }
    });

    qunit.testDone(function (result) {
        var summary = result.passed == result.total ? 'PASS ' : 'FAIL';
        console.log(summary + ': ' + result.name);
    });

    qunit.done(function (result) {
        console.log('tests run. total: ' + result.total + ' failed: ' + result.failed);
        if (typeof process != 'undefined') {
            if (result.failed > 0) {
                process.on('exit', function () {
                    process.exit(1);
                });
            }
        }
    });

    if (exports.environment() == 1 /* NodeJS */) {
        qunit.load();
    }
}
exports.runTests = runTests;

/** Compares two values (objects or arrays) and outputs a diff
* between 'a' and 'b', excluding
* any keys which are expected to have been added in 'b' and
* any keys which are expected to have been removed in 'b'
* expectedAdditions and expectedDeletions are arrays of '/'-separated paths
* beginning with 'root/'
*/
function compareObjects(a, b, expectedAdditions, expectedDeletions) {
    var diff = xdiff.diff(a, b);
    if (!diff) {
        // objects are exactly equal
        return [];
    }

    expectedAdditions = expectedAdditions || [];
    expectedDeletions = expectedDeletions || [];

    return diff.filter(function (change) {
        var type = change[0];
        var path = change[1].join('/');

        if (type == 'set' && expectedAdditions.indexOf(path) != -1) {
            return false;
        } else if (type == 'del' && expectedDeletions.indexOf(path) != -1) {
            return false;
        }
        return true;
    });
}
exports.compareObjects = compareObjects;

function assertEqual(assert, a, b) {
    var diff = exports.compareObjects(a, b);
    if (diff.length > 0) {
        console.log(diff);
    }
    assert.equal(diff.length, 0, 'Check objects are equal');
}
exports.assertEqual = assertEqual;
//# sourceMappingURL=test.js.map
