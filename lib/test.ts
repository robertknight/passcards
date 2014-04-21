/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

var qunit = require('qunitjs');

export interface Assert {
	equal(actual: any, expected: any, message: string) : void;
}

export function addTest(name : string, testFunc : (assert: Assert) => void) {
	qunit.test(name, testFunc);
}

export function runTests() {
	qunit.log((details: any) => {
		if (!details.result) {
			console.log('test failed');
			console.log(details);
		}
	});

	qunit.done((result: any) => {
		console.log('tests run. total: ' + result.total + ' failed: ' + result.failed);
		if (typeof process != 'undefined') {
			if (result.failed > 0) {
				process.exit(1)
			} else {
				process.exit(0);
			}
		}
	});

	if (typeof window == 'undefined') {
		qunit.load();
	}
}

