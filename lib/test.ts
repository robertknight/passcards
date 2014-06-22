/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

/// <reference path="../typings/argparse.d.ts" />
/// <reference path="../typings/xdiff.d.ts" />

// test.ts provides a wrapper around QUnitJS (qunitjs.com)
//
// Test cases are added using addTest() and addAsyncTest().
//
// Once all test cases have been added, the test suite should be
// started using start()
//
// In addition to wrappers around methods for adding test functions
// and invoking the tests, there are also utility methods for comparing
// nested objects and arrays.

import argparse = require('argparse');
var qunit = require('qunitjs');
import xdiff = require('xdiff');
import underscore = require('underscore');
import sprintf = require('sprintf');

import env = require('./base/env');

/** Interface for testing the values of objects during
  * a test.
  *
  * See http://api.qunitjs.com/category/assert/
  *
  * The assert methods throw if an assertion fails. The test harness catches such
  * failures and outputs diagnostics.
  */
export interface Assert {
	notEqual<T>(actual: T, notExpected: T, message?: string) : void;
	equal<T>(actual: T, expected: T, message?: string) : void;
	ok(result: boolean, message?: string) : void;
	throws<T>(func: Function, expected?: T, message?: string) : void;
}

interface TestCase {
	name: string
	testFunc: (assert: Assert) => void
	async: boolean
}

var testList : TestCase[] = [];

/** Add a test which completes synchronously.
  *
  * See qunit.test()
  */
export function addTest(name : string, testFunc : (assert: Assert) => void) {
	testList.push({name: name, testFunc: testFunc, async: false});
}

/** Add a test which completes asynchronously. @p testFunc must call
  * continueTests() once all async operations have completed to signal
  * the end of the test.
  *
  * Note that all asynchronous tests are executed concurrently.
  *
  * See qunit.asyncTest()
  */
export function addAsyncTest(name : string, testFunc : (assert: Assert) => void) {
	testList.push({name: name, testFunc: testFunc, async: true});
}

/** Inform the test runner that an async test has finished. This must be called
  * once all async operations in a test added with addAsyncTest() have completed.
  */
export function continueTests() {
	qunit.start();
}

export interface TestStartParams {
	name: string;
	module : string;
}

/** Add a setup function to invoke before each test case */
export function beforeTest(func: (details?: TestStartParams) => void) {
	qunit.testStart(func);
}

/** Registers a teardown function to be executed once all test cases
  * have finished.
  */
export function teardownSuite(func: () => void) {
	qunit.done(func);
}

interface AssertionResult {
	result: boolean
	actual: Object
	expected: Object
	message: string
	source: string
	module: string
	name: string
}

interface TestResult {
	name: string
	module: string
	failed: number
	passed: number
	total: number
	runtime: number
}

interface TestSuiteResult {
	failed: number
	passed: number
	total: number
	runtime: number
}

/** Start the test suite. The default mode is to run tests added with
  * addTest() and addAsyncTest().
  *
  * The test runner has a command-line parser which provides options
  * to list available tests, filter which tests are run and adjust
  * the verbosity of test output.
  *
  * @param args Command-line arguments for the test.
  */
export function start(args?: string[]) {
	if (!args && env.isNodeJS()) {
		args = process.argv.slice(2);
	}

	var parser = new argparse.ArgumentParser({
		description: 'Unit test suite'
	});
	parser.addArgument(['-f', '--filter'], {
		action: 'store',
		nargs: 1,
		dest: 'filter',
		help: 'Run only tests whose name matches FILTER'
	});
	parser.addArgument(['-l', '--list'], {
		action: 'store',
		nargs: 0,
		dest: 'list',
		help: 'List names of available tests'
	});
	parser.addArgument(['-v', '--verbose'], {
		action: 'store',
		nargs: 0,
		dest: 'verbose'
	});

	var opts = parser.parseArgs(args);
	var tests = testList;
	if (opts.filter) {
		tests = tests.filter((testCase) => {
			return testCase.name.indexOf(opts.filter) != -1;
		});
		if (opts.verbose) {
			var testNames = tests.map((testCase) => {
				return '"' + testCase.name + '"';
			});
			console.log(sprintf('Running %d matching tests: %s', tests.length, testNames.join(", ")));
		}
	}
	if (opts.list) {
		tests.forEach((testCase) => {
			console.log(testCase.name);
		});
	} else {
		run(tests);
	}
}

function run(tests: TestCase[]) {
	// randomize ordering of tests
	tests = underscore(tests).shuffle();

	tests.forEach((testCase) => {
		if (testCase.async) {
			qunit.asyncTest(testCase.name, testCase.testFunc);
		} else {
			qunit.test(testCase.name, testCase.testFunc);
		}
	});

	qunit.config.testTimeout = 3000;

	qunit.log((details: AssertionResult) => {
		if (!details.result) {
			console.log('test failed');
			console.log(details);
		}
	});

	qunit.testDone((result: TestResult) => {
		var summary = result.passed == result.total ? 'PASS ' : 'FAIL';
		var durationStr = sprintf(' (%sms)', result.runtime);
		console.log(summary, ': ', result.name, durationStr);
	});

	qunit.done((result: TestSuiteResult) => {
		var summary = sprintf('tests run. total assertions: %d, failed: %d, duration: %dms', result.total, result.failed, result.runtime);
		console.log(summary);
		if (env.isNodeJS()) {
			if (result.failed > 0) {
				process.on('exit', () => {
					process.exit(1);
				});
			}
		}
	});

	if (!env.isBrowser()) {
		qunit.load();
	}
}

/** Compares two values (objects or arrays) and outputs a diff
 * between 'a' and 'b', excluding
 * any keys which are expected to have been added in 'b' and
 * any keys which are expected to have been removed in 'b'
 * expectedAdditions and expectedDeletions are arrays of '/'-separated paths
 * beginning with 'root/'
 */
export function compareObjects(a: any, b: any, expectedAdditions?: string[], expectedDeletions?: string[]) : any[] {
	var diff = xdiff.diff(a, b);
	if (!diff) {
		// objects are exactly equal
		return [];
	}

	expectedAdditions = expectedAdditions || [];
	expectedDeletions = expectedDeletions || [];

	return diff.filter((change: any[]) => {
		var type : string = change[0];
		var path : string = change[1].join('/');

		if (type == 'set' && expectedAdditions.indexOf(path) != -1) {
			return false;
		} else if (type == 'del' && expectedDeletions.indexOf(path) != -1) {
			return false
		}
		return true;
	});
}

/** Check that two objects or arrays are equal.
  * If the objects or arrays are not equal, print a diff between the two.
  * If @p properties is specified, only the listed properties are compared
  * between objects @p a and @p b.
  */
export function assertEqual(assert: Assert, a: any, b: any, properties?: string[]) {
	if (properties) {
		a = underscore.pick.apply(null, [a].concat(<any[]>properties));
		b = underscore.pick.apply(null, [b].concat(<any[]>properties));
	}

	var diff = compareObjects(a, b);
	if (diff.length > 0) {
		console.log(diff);
	}
	assert.equal(diff.length, 0, 'Check objects are equal');
}

