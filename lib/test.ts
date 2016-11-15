// test.ts provides a wrapper around QUnitJS (qunitjs.com)
//
// Test cases are added using addTest().
//
// Once all test cases have been added, the test suite should be
// started using start()
//
// In addition to wrappers around methods for adding test functions
// and invoking the tests, there are also utility methods for comparing
// nested objects and arrays.

import assert = require('assert');
import argparse = require('argparse');
import colors = require('colors');
import fs = require('fs');
import mkdirp = require('mkdirp');
import path = require('path');
import underscore = require('underscore');
import xdiff = require('xdiff');
var qunit = require('qunitjs');

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
	notEqual<T>(actual: T, notExpected: T, message?: string): void;
	equal<T>(actual: T, expected: T, message?: string): void;
	deepEqual<T>(actual: T, expected: T, message?: string): void;
	strictEqual<T>(actual: T, expected: T, message?: string): void;
	ok<T>(result: T, message?: string): void;
	throws<T>(func: Function, expected?: T, message?: string): void;
}

interface TestCase {
	name: string;
	testFunc: (assert: Assert) => void;
}

var testList: TestCase[] = [];
var testStartTimer: NodeJS.Timer;

function scheduleAutoStart() {
	if (!testStartTimer) {
		testStartTimer = global.setTimeout(() => {
			start();
		}, 10);
	}
}

let sourceCache: Map<string, string[]>;

function extractLines(filePath: string, start: number, end: number) {
	if (!sourceCache) {
		sourceCache = new Map<string, string[]>();
	}
	if (!sourceCache.has(filePath)) {
		let content = fs.readFileSync(filePath).toString('utf-8');
		let lines = content.split('\n');
		sourceCache.set(filePath, lines);
	}
	return sourceCache.get(filePath).slice(start, end);
}

// returns the root directory of the parent NPM
// module containing 'filePath'
function packageRoot(filePath: string) {
	if (filePath.length <= 1 || filePath[0] !== '/') {
		return '';
	}
	let dirPath = path.dirname(filePath);
	while (dirPath !== '/' && !fs.existsSync(`${dirPath}/package.json`)) {
		dirPath = path.dirname(dirPath);
	}
	return dirPath;
}

/** Takes a stack trace returned by Error.stack and returns
  * a more easily readable version as an array of strings.
  *
  * - Path names are expressed relative to the NPM module
  *   containing the current directory.
  * - Context snippets are added for each stack frame
  */
function formatStack(trace: string) {
	assert(trace);
	try {
		let traceLines = trace.split('\n');
		let rootPath = packageRoot(__filename);
		let locationRegex = /([^() ]+):([0-9]+):([0-9]+)/;
		let formattedLines: string[] = [];
		for (let i = 0; i < traceLines.length; i++) {
			let line = traceLines[i].trim();
			let locationMatch = line.match(locationRegex);
			if (locationMatch) {
				let filePath = locationMatch[1];

				let lineNumber = parseInt(locationMatch[2]);
				let context = '';
				try {
					if (filePath[0] === '/') {
						context = extractLines(filePath, lineNumber - 1, lineNumber)[0].trim();
					}
				} catch (e) {
					context = '<source unavailable>';
				}
				formattedLines.push(`  ${path.relative(rootPath, filePath) }:${lineNumber}: ${context}`);
			} else {
				formattedLines.push(`  ${line}`);
			}
		}
		return formattedLines;
	} catch (ex) {
		return [`<failed to format stack: ${ex.toString() }>`].concat(ex.stack.split('\n'));
	}
}

/** Add a test which either completes synchronously or returns
  * a promise.
  *
  * See qunit.test()
  */
export function addTest(name: string, testFunc: (assert: Assert) => void) {
	testList.push({
		name,
		testFunc
	});
	scheduleAutoStart();
}

export interface TestStartParams {
	name: string;
	module: string;
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
	source?: string
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

function requireNodeVersion(version: string) {
	var semver = require('semver');
	if (env.isNodeJS() && semver.lt(process.version, version)) {
		console.error('Node version %s or later is required', version);
		process.exit(1);
	}
}

/** Start the test suite. The default mode is to run tests added with
  * addTest().
  *
  * The test runner has a command-line parser which provides options
  * to list available tests, filter which tests are run and adjust
  * the verbosity of test output.
  *
  * @param args Command-line arguments for the test.
  */
export function start(args?: string[]) {
	requireNodeVersion('0.12.0');

	if (!args && env.isNodeJS()) {
		args = process.argv.slice(2);
	}
	cancelAutoStart();

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
			console.log('Running %d matching tests: %s', tests.length, testNames.join(", "));
		}
	}
	if (opts.list) {
		tests.forEach((testCase) => {
			console.log(testCase.name);
		});
	} else {
		console.log('START: %s', path.basename(process.argv[1]));
		run(tests);
	}
}

/** Returns the path to a temporary data directory for
  * use by the current test suite.
  */
export function tempDir() {
	let tmpDir: string;
	if (process.env.TMPDIR) {
		tmpDir = process.env.TMPDIR;
	} else {
		tmpDir = '/tmp';
	}
	let testSuiteName = path.basename(process.argv[1]);
	let dirPath = `${tmpDir}/passcards-tests/${testSuiteName}`;
	mkdirp.sync(dirPath);
	return dirPath;
}

function run(tests: TestCase[]) {
	// randomize ordering of tests
	tests = underscore(tests).shuffle();

	tests.forEach((testCase) => {
		qunit.test(testCase.name, testCase.testFunc);
	});

	if (!timeout()) {
		setTimeout(3000);
	}

	qunit.log((details: AssertionResult) => {
		if (!details.result) {
			let message = details.message || 'Assert failed';
			console.log(colors.red(`ERROR: ${message}, actual: ${details.actual}, expected ${details.expected}`));
			if (details.source) {
				console.log(colors.yellow(formatStack(details.source).join('\n')));
			}
		}
	});

	qunit.testDone((result: TestResult) => {
		const FORMAT_STR = '%s (%sms)';
		let formatStr: string;
		if (result.passed === result.total) {
			formatStr = colors.green(`PASS: ${FORMAT_STR}`);
		} else {
			formatStr = colors.red(`FAIL: ${FORMAT_STR}`);
		}
		console.log(formatStr, result.name, result.runtime);
	});

	qunit.done((result: TestSuiteResult) => {
		let colorFunc = result.failed === 0 ? colors.green : colors.yellow;
		console.log(colorFunc('END: Assertions: %d, Failed: %d, Duration: %dms'), result.total, result.failed, result.runtime);
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
export function compareObjects(a: any, b: any, expectedAdditions?: string[], expectedDeletions?: string[]): any[] {
	var diff = xdiff.diff(a, b);
	if (!diff) {
		// objects are exactly equal
		return [];
	}

	expectedAdditions = expectedAdditions || [];
	expectedDeletions = expectedDeletions || [];

	return diff.filter((change: any[]) => {
		var type: string = change[0];
		var path: string = change[1].join('/');

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
export function assertEqual(assert: Assert, a: any, b: any, properties?: string[], excludeProperties?: string[]) {
	if (properties) {
		a = underscore.pick.apply(null, [a].concat(<any[]>properties));
		b = underscore.pick.apply(null, [b].concat(<any[]>properties));
	} else if (excludeProperties) {
		a = underscore.omit.apply(null, [a].concat(<any[]>excludeProperties));
		b = underscore.omit.apply(null, [b].concat(<any[]>excludeProperties));
	}

	var diff = compareObjects(a, b);
	if (diff.length > 0) {
		console.log(diff);
	}
	assert.equal(diff.length, 0, 'Check objects are equal');
}

/** Cancel any pending auto-start of the test suite.
  * This will prevent tests auto-starting after being
  * added with addTest() or addTest()
  */
export function cancelAutoStart() {
	if (testStartTimer) {
		clearTimeout(testStartTimer);
		testStartTimer = null;
	}
}

/** Set the global default timeout for individual test cases.
  */
export function setTimeout(timeoutMs: number) {
	qunit.config.testTimeout = timeoutMs;
}

/** Returns the global default timeout for individual test
  * cases or undefined to use a default value.
  */
export function timeout() {
	return qunit.config.testTimeout;
}
