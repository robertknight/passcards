import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import controls_theme = require('./theme');
import fonts = require('./fonts');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');
import svg_icon = require('./svg_icon');
import style_util = require('../base/style_util');

var theme = style.create({
	button: {
		base: {
			cursor: 'pointer',

			// remove dotted focus outline around button
			// elements in most browsers
			':focus': {
				outline: 'none'
			},

			// remove dotted focus outline around <button>
			// elements in Firefox.
			//
			// see http://stackoverflow.com/questions/71074
			'::-moz-focus-inner': {
				border: 0
			},

			transition: style_util.transitionOn({
				backgroundColor: .3,
				boxShadow: .3
			}),

			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',

			// disable default button styles
			border: 'none',
			backgroundColor: 'transparent',
			// disable button rounding on iOS
			WebkitAppearance: 'none',

			// override default fonts for <button>
			// element. Required when tested in Firefox 37
			fontFamily: fonts.FAMILY,

			// disable drag of button image
			userSelect: 'none'
		},

		raised: {
			boxShadow: controls_theme.SHADOWS.RAISED_BUTTON,

			':hover': {
				boxShadow: controls_theme.SHADOWS.RAISED_BUTTON_HOVERED
			},

			':focus': {
				boxShadow: controls_theme.SHADOWS.RAISED_BUTTON_HOVERED
			}
		},

		icon: {
			 width: 24,
			 height: 24
		},

		floatingAction: {
			borderRadius: '50%',
			zIndex: controls_theme.Z_LAYERS.FLOATING_ACTION_BUTTON,
			position: 'relative',
			overflow: 'hidden',

			// see http://www.google.co.uk/design/spec/components/buttons.html#buttons-floating-action-button
			normalSize: {
				width: 56,
				height: 56
			},

			miniSize: {
				width: 40,
				height: 40
			}
		},

		rectangular: {
			borderRadius: 3,
			overflow: 'hidden',

			position: 'relative',
			width: 'fit-content',
			marginLeft: 4,
			marginRight: 4,

			paddingLeft: 8,
			paddingRight: 8,

			minWidth: 64,

			height: 36,

			':hover': {
				backgroundColor: 'rgba(0,0,0,0.1)'
			},
		},

		circular: {
			borderRadius: '50%',
			position: 'relative',
			overflow: 'hidden',
			margin: 5,
			minWidth: 40,
			minHeight: 40,
			width: 40,
			height: 40
		},

		label: {
			fontWeight: fonts.button.weight,
			fontSize: fonts.button.size,
			textTransform: 'uppercase',

			userSelect: 'none'
		},

		// styles applied to buttons which have custom children
		customContent: {
			height: 'initial'
		}
	},
});

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

	/** Prevents interaction with the button */
	disabled?: boolean;

	children?: any;
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

			if (!this.props.disabled) {
				containerStyles.push(theme.button.raised);
			}
		}

		if (this.props.backgroundColor) {
			containerStyles.push({backgroundColor: this.props.backgroundColor});
		}

		if (this.props.children) {
			containerStyles.push(theme.button.customContent);
		}

		var labelStyles: any[] = [theme.button.label];
		if (this.props.color) {
			labelStyles.push({color: this.props.color});
		}
		if (this.props.disabled) {
			labelStyles.push({opacity: 0.26});
		}

		var buttonIcon: React.ReactElement<any>;
		if (this.props.iconUrl) {
			// the SVG icon here is wrapped in a container
			// <div> to work around an issue in Firefox where
			// a fixed-width <div> or <svg> placed as a direct child
			// of a <button> element gets left-aligned instead of being
			// centered.
			//
			// Tested in Firefox 37.
			buttonIcon = react.DOM.div({},
				svg_icon.SvgIconF(style.mixin(theme.button.icon, {
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
				}))
			);
		}

		var label: React.ReactElement<any>;
		if (this.props.value && isRectangular) {
			label = react.DOM.div(style.mixin(labelStyles, {}), this.props.value);
		}

		return react.DOM.button(style.mixin(containerStyles, {
			tabIndex: 0,
			onClick: (e: React.MouseEvent) => this.props.onClick(e),
			title: this.props.value,
			type: 'button',
			disabled: this.props.disabled
		}),
			ripple.InkRippleF({
				radius: rippleRadius,
				color: this.props.rippleColor,
				ref: 'ripple'
			}),
			buttonIcon,
			label,
			this.props.children
		);
	}
}

export var ButtonF = reactutil.createFactory(Button);

