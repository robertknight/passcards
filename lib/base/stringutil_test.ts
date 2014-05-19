import stringutil = require('./stringutil');

import testLib = require('../test');

testLib.addTest('truthy keys', (assert) => {
	var obj = {
		class1: true,
		class2: false,
		class3: 'enabled',
		class4: ''
	}
	assert.equal(stringutil.truthyKeys(obj), 'class1 class3');
});

testLib.runTests();

