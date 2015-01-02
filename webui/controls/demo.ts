/// <reference path="../../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');
import style = require('ts-style');

import button = require('./button');
import env = require('../../lib/base/env');
import menu = require('./menu');
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

interface ControlDemoAppProps {
	viewportRect: reactutil.Rect;
}

interface ControlDemoAppState {
	menuPos?: {
		left: number;
		top: number;
	};
}

class ControlDemoApp extends typed_react.Component<ControlDemoAppProps, ControlDemoAppState> {
	getInitialState() {
		return {};
	}

	render() {
		var popupMenu: React.ReactElement<menu.MenuProps>;
		if (this.state.menuPos) {
			var menuItems = [{
				label: 'Item One',
				onClick: () => alert('Item one clicked')
			},{
				label: 'Item Two',
				onClick: () => alert('Item two clicked')
			},{
				label: 'Item Three',
				onClick: () => alert('Item three clicked')
			}];
			popupMenu = menu.MenuF({
				items: menuItems,
				viewportRect: this.props.viewportRect,
				sourceRect: {
					left: this.state.menuPos.left,
					top: this.state.menuPos.top,
					right: this.state.menuPos.left,
					bottom: this.state.menuPos.top
				},
				onDismiss: () => {
					this.setState({menuPos: null});
				}
			});
		}

		return react.DOM.div({
		},
			'Ink Ripple',
			react.DOM.div(style.mixin(styles.rippleContainer, {
				onClick: (e: React.MouseEvent) => {
					e.preventDefault();
					this.setState({menuPos: {left: e.pageX, top: e.pageY}});
				}	
			}),
				ripple.InkRippleF({color: '#808080'},
					'Ripple Text'
				)
			),
			popupMenu,
			button.ButtonF({
				value: 'Click Me',
				onClick: () => {
					alert('Button Clicked');
				}
			})
		);
	}
}
var ControlDemoAppF = reactutil.createFactory(ControlDemoApp);

function main() {
	var elt = document.getElementById('app');
	var body = elt.ownerDocument.body;

	var rootView = react.render(ControlDemoAppF({viewportRect: body.getBoundingClientRect()}), elt);
	elt.ownerDocument.defaultView.onresize = () => {
		rootView.setProps({
			viewportRect: body.getBoundingClientRect()
		});
	};
}

if (env.isBrowser()) {
	main();
}


