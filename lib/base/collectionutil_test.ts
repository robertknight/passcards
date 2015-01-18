import collectionutil = require('./collectionutil');
import testLib = require('../test');

import Q = require('q');

testLib.addTest('add/fetch keys', (assert) => {
	var map = new collectionutil.BiDiMap<number,string>();
	map.add(1, 'one')
	   .add(2, 'two')
	   .add(3, 'three');

	assert.equal(map.get(1), 'one');
	assert.equal(map.get(3), 'three');
	assert.equal(map.get(4), null);

	assert.equal(map.get2('one'), 1);
	assert.equal(map.get2('three'), 3);
	assert.equal(map.get2('four'), null);
});

testLib.addTest('map polyfill basic ops', (assert) => {
	var map: Map<string,number> = new collectionutil.PMap<string,number>();

	// set(), get(), delete()
	assert.equal(map.size, 0);
	assert.ok(!map.has('akey'));
	assert.equal(map.set('akey', 42), map);
	assert.equal(map.size, 1);
	assert.ok(map.has('akey'));
	assert.equal(map.get('akey'), 42);
	assert.ok(map.delete('akey'));
	assert.equal(map.size, 0);
	assert.ok(!map.delete('akey'));

	// duplicate insert
	map.set('akey', 13);
	map.set('akey', 23);
	assert.equal(map.size, 1);
	assert.equal(map.get('akey'), 23);

	// map clear()
	map.clear();
	assert.equal(map.size, 0);
	assert.ok(!map.has('akey'));
});

interface KeyValue {
	key: string;
	value: number;
}

testLib.addTest('map iteration', (assert) => {
	var map: Map<string, number> = new collectionutil.PMap<string,number>();
	map.set('foo', 1);
	map.set('bar', 2);

	var entries: KeyValue[] = [];
	map.forEach((value, key) => {
		entries.push({key: key, value: value});
	});
	entries.sort((a,b) => {
		return a.key.localeCompare(b.key);
	});
	assert.deepEqual(entries, [
		{key: 'bar', value: 2},
		{key: 'foo', value: 1}
	]);
});

testLib.addTest('convert list to map', (assert) => {
	var map = collectionutil.listToMap([{k:1, v:1}, {k:2, v:2}, {k:3, v:3}], (item) => {
		return item.k;
	});
	assert.equal(map.size, 3);
	assert.ok(map.has(1));
	assert.ok(map.has(2));
	assert.ok(map.has(3));
	assert.deepEqual(map.get(3), {k:3, v:3});
});

type KeyValueMap = {[index: string]: number};

testLib.addAsyncTest('batched updates', (assert) => {
	var savedItems: KeyValueMap = {};

	var queue = new collectionutil.BatchedUpdateQueue<KeyValue>((updates: KeyValue[]) => {
		updates.forEach((pair) => {
			savedItems[pair.key] = pair.value;
		});
		return Q<void>(null);
	});

	var update1 = queue.push({key: 'one', value: 1});
	var update2 = queue.push({key: 'one', value: 2});
	var update3 = queue.push({key: 'two', value: 3});

	return Q.all([update1, update2, update3]).then(() => {
		assert.deepEqual(savedItems, <KeyValueMap>{
			one: 2,
			two: 3
		});
	});
});

