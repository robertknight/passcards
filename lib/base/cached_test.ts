import Q = require('q');

import cached = require('./cached');
import testLib = require('../test');

testLib.addAsyncTest('read / write cached value', (assert) => {
	var value = 5;
	var cachedValue = new cached.Cached<number>(
		() => { return Q(value); },
		(newValue) => {
			value = newValue;
			return Q<void>(null);
		}
		);

	return cachedValue.get().then((fetchedValue) => {
		assert.equal(fetchedValue, value);
		value = 52;
		return cachedValue.get();
	}).then((fetchedValue) => {
		assert.equal(fetchedValue, 5);
		return cachedValue.set(6);
	}).then(() => {
		assert.equal(value, 6);
		return cachedValue.get();
	}).then((fetchedValue) => {
		assert.equal(fetchedValue, 6);
	});
});

testLib.addAsyncTest('clear cached value', (assert) => {
	var value = 7;
	var cachedValue = new cached.Cached<number>(
		() => { return Q(value); },
		(newValue) => {
			value = newValue;
			return Q<void>(null);
		}
		);

	return cachedValue.get().then((fetchedValue) => {
		assert.equal(fetchedValue, 7);
		value = 42;
		cachedValue.clear();
		return cachedValue.get();
	}).then((fetchedValue) => {
		assert.equal(fetchedValue, 42);
	});
});
