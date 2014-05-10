/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/xdiff.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

var qunit = require('qunitjs');
import xdiff = require('xdiff');
import underscore = require('underscore');

export interface Assert {
	equal(actual: any, expected: any, message?: string) : void;
	ok(result: boolean) : void;
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

export function beforeTest(func: () => void) {
	qunit.testStart(func);
}

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
	duration: number
}

interface TestSuiteResult {
	failed: number
	passed: number
	total: number
	runtime: number
}

export enum Environment {
	Browser,
	NodeJS
}

export function environment() : Environment {
	if (typeof window == 'undefined') {
		return Environment.NodeJS;
	} else {
		return Environment.Browser;
	}
}

/** Run all tests queued with addTest() and addAsyncTest() */
export function runTests(filter?: string) {
	if (filter) {
		testList = testList.filter((testCase) => {
			return testCase.name.indexOf(filter) != -1;
		});
	}

	testList.forEach((testCase) => {
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
		console.log(summary + ': ' + result.name);
	});

	qunit.done((result: TestSuiteResult) => {
		console.log('tests run. total: ' + result.total + ' failed: ' + result.failed);
		if (typeof process != 'undefined') {
			if (result.failed > 0) {
				process.on('exit', () => {
					process.exit(1);
				});
			}
		}
	});

	if (environment() == Environment.NodeJS) {
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

