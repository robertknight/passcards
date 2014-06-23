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

testLib.addTest('parse command line', (assert) => {
	var cases = [
		{ cmd: 'one two three', expect: ['one', 'two', 'three'] },
		{ cmd: 'one "two three"', expect: ['one', 'two three'] },
		{ cmd: 'one\\ two\\ three', expect: ['one two three'] },
		{ cmd: 'one "two \'three\' four" five', expect: ['one', "two 'three' four", 'five'] }
	];
	cases.forEach((testCase) => {
		var actual = stringutil.parseCommandLine(testCase.cmd);
		assert.deepEqual(actual, testCase.expect);
	});
});

testLib.start();

