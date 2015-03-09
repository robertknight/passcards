/// <reference path="../../typings/react-0.12.d.ts" />

import reactutil = require('./reactutil');
import testLib = require('../../lib/test');

testLib.addTest('merge props', (assert) => {
	assert.deepEqual(reactutil.mergeProps({
		id: 'instanceId',
		className: 'instanceClass',
		onClick: 'event handler'
	}, {
			className: 'componentClass'
		}), {
			id: 'instanceId',
			className: 'componentClass instanceClass',
			onClick: 'event handler'
		});
});

testLib.addTest('object changes', (assert) => {
	var testCases = [{
		a: { a: 1, b: 2 },
		b: { a: 1, b: 2 },
		expectChanged: false
	}, {
			a: { a: 1, b: 2 },
			b: { a: 1, b: 3 },
			expectChanged: true
		}];

	testCases.forEach((testCase) => {
		assert.equal(reactutil.objectChanged(testCase.a, testCase.b), testCase.expectChanged);
	});
});

testLib.start();

