/// <reference path="../../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');
import style = require('ts-style');

import env = require('../../lib/base/env');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');

var styles = style.create({
	rippleContainer: {
		width: 300,
		height: 50,
		border: '1px solid #cccccc',
		fontFamily: 'Roboto, Helvetica Neue, Segoe UI, Helvetica, Arial',
		position: 'relative',
		WebkitTapHighlightColor: 'transparent',
		WebkitUserSelect: 'none'
	}
});

class ControlDemoApp extends typed_react.Component<{},{}> {
	render() {
		return react.DOM.div({},
			'Ink Ripple',
			react.DOM.div(style.mixin(styles.rippleContainer),
				ripple.InkRippleF({color: {r: 0x80, g: 0x80, b:0x80}},
					'Ripple Text'
				)
			)
		);
	}
}
var ControlDemoAppF = reactutil.createFactory(ControlDemoApp);

function main() {
	var elt = document.getElementById('app');
	react.render(ControlDemoAppF(), elt);
}

if (env.isBrowser()) {
	main();
}


