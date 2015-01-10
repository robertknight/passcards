import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import div = require('../base/div');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');
import svg_icon = require('./svg_icon');
import theme = require('../theme');

export enum Style {
	Rectangular,
	RaisedRectangular,
	FloatingAction,
	MiniFloatingAction,
	Icon
}

export interface ButtonProps {
	onClick: (e: React.MouseEvent) => void;

	/** Label for the button */
	value: string;

	/** Specifies the style for the button. */
	style: Style;

	/** Background color for the button */
	backgroundColor?: string;

	/** Color for the button's text or the fill
	  * color of the SVG icon.
	  */
	color?: string;

	/** Color used for the ripple that fills the button
	  * when touched.
	  */
	rippleColor?: string;

	/** The URL of the SVG icon for this button */
	iconUrl?: string;
}

export class Button extends typed_react.Component<ButtonProps,{}> {
	componentDidMount() {
		setTimeout(() => {
			if (!this.isMounted()) {
				return;
			}

			var button = <HTMLElement>(this.getDOMNode());
			var ripple = <ripple.InkRipple>(this.refs['ripple']);
			ripple.setState({
				width: button.offsetWidth,
				height: button.offsetHeight
			});
		}, 1000);
	}

	render() {
		var rippleRadius = 100;

		var isRectangular = this.props.style === Style.Rectangular ||
		                    this.props.style === Style.RaisedRectangular;

		var containerStyles: any[] = [theme.button.base];
		if (this.props.style === Style.FloatingAction ||
			this.props.style === Style.MiniFloatingAction) {
			containerStyles.push(theme.button.floatingAction);
			if (this.props.style === Style.MiniFloatingAction) {
				rippleRadius = 60;
				containerStyles.push(theme.button.floatingAction.miniSize);
			} else {
				rippleRadius = 80;
				containerStyles.push(theme.button.floatingAction.normalSize);
			}
		} else if (isRectangular) {
			containerStyles.push(theme.button.rectangular);
		} else if (this.props.style === Style.Icon) {
			containerStyles.push(theme.button.circular);
		}

		if (this.props.style === Style.RaisedRectangular ||
			this.props.style === Style.FloatingAction ||
			this.props.style === Style.MiniFloatingAction) {
			containerStyles.push(theme.button.raised);
		}

		if (this.props.backgroundColor) {
			containerStyles.push({backgroundColor: this.props.backgroundColor});
		}

		var labelStyles: any[] = [theme.button.label];
		if (this.props.color) {
			labelStyles.push({color: this.props.color});
		}

		var buttonIcon: React.ReactElement<any>;
		if (this.props.iconUrl) {
			buttonIcon = svg_icon.SvgIconF(style.mixin(theme.button.icon, {
				href: this.props.iconUrl,
				fill: this.props.color,
				width: 24,
				height: 24,
				viewBox: {
					x: 0,
					y: 0,
					width: 24,
					height: 24
				}
			}));
		}

		var label: React.ReactElement<any>;
		if (this.props.value && isRectangular) {
			label = react.DOM.div(style.mixin(labelStyles, {}), this.props.value);
		}

		return react.DOM.div(style.mixin(containerStyles, {
			role: 'button',
			tabIndex: 0,
			onClick: (e: React.MouseEvent) => this.props.onClick(e)
		}),
			ripple.InkRippleF({
				radius: rippleRadius,
				color: this.props.rippleColor,
				ref: 'ripple'
			}),
			buttonIcon,
			label
		);
	}
}

export var ButtonF = reactutil.createFactory(Button);

