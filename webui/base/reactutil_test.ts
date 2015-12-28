
import reactutil = require('./reactutil');
import testLib = require('../../lib/test');

interface PropMergeResult {
	id?: string;
	className?: string;
	onClick?: string;
};

testLib.addTest('merge props', (assert) => {
	assert.deepEqual<PropMergeResult>(reactutil.mergeProps({
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
