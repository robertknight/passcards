import Q = require('q');

import testLib = require('../test');
import asyncutil = require('./asyncutil');

testLib.addAsyncTest('test run sequence', (assert) => {
	var values = [1, 1, 2, 3, 5, 8, 13];
	var runOrder : number[] = [];

	var funcs : Array<() => Q.Promise<number>> = [];
	values.forEach((value, index) => {
		funcs.push(() => {
			runOrder.push(index+1);
			return Q(value);
		});
	});

	asyncutil.series(funcs).then((result) => {
		testLib.assertEqual(assert, result, values);
		testLib.assertEqual(assert, runOrder, [1, 2, 3, 4, 5, 6, 7]);
		testLib.continueTests();
	});
});

testLib.addAsyncTest('async while loop', (assert) => {
	var counter = 0;

	asyncutil.until(() => {
		if (counter == 5) {
			return Q(true);
		} else {
			++counter;
			return Q(false);
		}
	}).then((done) => {
		testLib.assertEqual(assert, done, true);
		testLib.assertEqual(assert, counter, 5);
		testLib.continueTests();
	}).done();
});

testLib.start();

