import collectionutil = require('./collectionutil');
import testLib = require('../test');

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

testLib.start();

