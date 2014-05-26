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

testLib.runTests();

