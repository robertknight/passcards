/// <reference path="../../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../../typings/dom.d.ts" />
/// <reference path="../../typings/react-0.12.d.ts" />

// Re-usable UI controls that are used in different parts
// of the front-end

import react = require('react');
import typed_react = require('typed-react');
import sprintf = require('sprintf');
import style = require('ts-style');
import underscore = require('underscore');

import div = require('../base/div');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');
import theme = require('../theme');
import svg_icon = require('./svg_icon');

export class ToolbarButtonProps {
	iconHref: string;
}

interface ToolbarButtonState {
	pressed?: boolean;
}

export class ToolbarButton extends typed_react.Component<ToolbarButtonProps,ToolbarButtonState> {
	getInitialState() {
		return {};
	}

	render() {
		return div([theme.toolbarButton.icon,
			        this.state.pressed ? theme.toolbarButton.active : null],	
			reactutil.mergeProps(this.props, {
			onMouseDown: () => {
				this.setState({pressed: true});
			},
			onMouseUp: () => {
				this.setState({pressed: false});
			}
		}),
		svg_icon.SvgIconF({
			href: this.props.iconHref,
			width: 20,
			height: 20,
			fill: 'white',
			viewBox: {x: 0, y: 0, width: 22, height: 22}
		}));
	}
}

export var ToolbarButtonF = reactutil.createFactory(ToolbarButton);

