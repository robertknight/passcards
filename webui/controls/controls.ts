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
		SvgIconF({
			href: this.props.iconHref,
			width: 20,
			height: 20,
			fill: 'white',
			viewBox: {x: 0, y: 0, width: 22, height: 22}
		}));
	}
}

export var ToolbarButtonF = reactutil.createFactory(ToolbarButton);

export class SvgIconProps {
	href: string;
	fill: string;
	viewBox: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	width: number;
	height: number;
}

export class SvgIcon extends typed_react.Component<SvgIconProps, {}> {
	render() {
		return react.DOM.svg(reactutil.mergeProps(this.props, {
			dangerouslySetInnerHTML: {
				__html: sprintf('<use x="0" y="0" fill="%s" xlink:href="%s"></use>',
				  underscore.escape(this.props.fill), underscore.escape(this.props.href))
			},
			viewBox: sprintf('%d %d %d %d', this.props.viewBox.x, this.props.viewBox.y,
			  this.props.viewBox.width, this.props.viewBox.height),
			width: this.props.width,
			height: this.props.height
		}));
	}
}

export var SvgIconF = reactutil.createFactory(SvgIcon);

export interface ActionButtonProps {
	value: string;
	onClick: (e: MouseEvent) => void;
}

export class ActionButton extends typed_react.Component<ActionButtonProps,{}> {
	componentDidMount() {
		setTimeout(() => {
			if (!this.isMounted()) {
				return;
			}

			var button = <HTMLButtonElement>(this.refs['button'].getDOMNode());
			var ripple = <ripple.InkRipple>(this.refs['ripple']);
			ripple.setState({
				width: button.offsetWidth,
				height: button.offsetHeight
			});
		}, 1000);
	}

	render() {
		return div(theme.actionButton.container, {},
			react.DOM.input(reactutil.mergeProps(this.props, {
				className: style.classes(theme.actionButton.button),
				type: 'button',
				ref: 'button'
			})),
			ripple.InkRippleF({color: 'rgb(252,228,236)', radius: 100, ref: 'ripple'})
		);
	}
}

export var ActionButtonF = reactutil.createFactory(ActionButton);

