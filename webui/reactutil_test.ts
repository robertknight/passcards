/// <reference path="../typings/react-0.12.d.ts" />

import reactutil = require('./reactutil');
import testLib = require('../lib/test');

testLib.addTest('merge props', (assert) => {
	assert.deepEqual(reactutil.mergeProps({
		id: 'instanceId',
		className: 'instanceClass',
		onClick: 'event handler'
	},{
		className: 'componentClass'
	}),{
		id: 'instanceId',
		className: 'componentClass instanceClass',
		onClick: 'event handler'
	});
});

testLib.start();

