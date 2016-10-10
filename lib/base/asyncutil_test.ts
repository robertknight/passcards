import testLib = require('../test');
import asyncutil = require('./asyncutil');

testLib.addAsyncTest('test run sequence', (assert) => {
	var values = [1, 1, 2, 3, 5, 8, 13];
	var runOrder: number[] = [];

	var funcs: Array<() => Promise<number>> = [];
	values.forEach((value, index) => {
		funcs.push(() => {
			runOrder.push(index + 1);
			return Promise.resolve(value);
		});
	});

	return asyncutil.series(funcs).then((result) => {
		testLib.assertEqual(assert, result, values);
		testLib.assertEqual(assert, runOrder, [1, 2, 3, 4, 5, 6, 7]);
	});
});

testLib.addAsyncTest('async while loop', (assert) => {
	var counter = 0;

	return asyncutil.until(() => {
		if (counter == 5) {
			return Promise.resolve(true);
		} else {
			++counter;
			return Promise.resolve(false);
		}
	}).then((done) => {
		testLib.assertEqual(assert, done, true);
		testLib.assertEqual(assert, counter, 5);
	});
});

testLib.addAsyncTest('promise to result', (assert) => {
	var resolvedPromise = Promise.resolve('hello');
	var rejectedPromise = Promise.reject<string>(new Error('failed'));

	return asyncutil.result<string, Error>(resolvedPromise).then((result) => {
		assert.equal(result.value, 'hello');
		assert.equal(result.error, null);
		return asyncutil.result<string, Error>(rejectedPromise);
	}).then((result) => {
		assert.equal(result.value, null);
		assert.ok(result.error instanceof Error);
	});
});

