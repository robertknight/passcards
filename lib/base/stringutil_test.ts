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

testLib.addTest('string search ignoring case', (assert) => {
	assert.equal(stringutil.indexOfIgnoreCase('fooBARbaz','bar'), 3);
});

testLib.addTest('string compare ignoring case', (assert) => {
	assert.ok(stringutil.equalIgnoreCase('foo', 'FOO'));
	assert.ok(stringutil.equalIgnoreCase('',''));
	assert.ok(!stringutil.equalIgnoreCase('foo', 'bar'));
	assert.ok(!stringutil.equalIgnoreCase('foo', 'foob'));
	assert.ok(!stringutil.equalIgnoreCase('foo', 'bfoo'));
});

testLib.addTest('starts with', (assert) => {
	assert.equal(stringutil.startsWith('one two', 'one'), true);
	assert.equal(stringutil.startsWith('one two', 'three'), false);
});

testLib.addTest('ends with', (assert) => {
	assert.equal(stringutil.endsWith('one two', 'two'), true);
	assert.equal(stringutil.endsWith('one two', 'one'), false);
	assert.equal(stringutil.endsWith('', '/'), false);
});

testLib.addTest('replace last', (assert) => {
	assert.equal(stringutil.replaceLast('one two one', 'one', 'three'), 'one two three');
});

testLib.start();

