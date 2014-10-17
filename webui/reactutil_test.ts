/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');

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

testLib.addTest('map to component array', (assert) => {
	var firstChild = react.DOM.div({id:'first'});
	var secondChild = react.DOM.div({id:'second'});
	var map = {
		firstChild: firstChild,
		secondChild: secondChild
	};
	var ary = reactutil.mapToComponentArray(map);

	ary.forEach((_component) => {
		var component = <any>_component;
		if (component.props.id == 'first') {
			assert.equal(component.props.key, 'firstChild');
		} else if (component.props.id == 'second') {
			assert.equal(component.props.key, 'secondChild');
		}
	});
});

testLib.start();

