/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/dom.d.ts" />
/// <reference path="../typings/react-0.12.d.ts" />

// Re-usable UI controls that are used in different parts
// of the front-end

import react = require('react');
import typed_react = require('typed-react');
import sprintf = require('sprintf');
import underscore = require('underscore');

import reactutil = require('./reactutil');
import style = require('./base/style');
import theme = require('./theme');

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
		return react.DOM.div(reactutil.mergeProps(this.props, {
			className: style.classes(theme.toolbarButton.icon,
			  this.state.pressed ? theme.toolbarButton.active : null),
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
			var button = <HTMLButtonElement>(this.refs['button'].getDOMNode());
			var ripple = <InkRipple>(this.refs['ripple']);
			ripple.setState({
				width: button.offsetWidth,
				height: button.offsetHeight
			});
		}, 1000);
	}

	render() {
		return react.DOM.div({
			className: style.classes(theme.actionButton.container)
		},
			react.DOM.input(reactutil.mergeProps(this.props, {
				className: style.classes(theme.actionButton.button),
				type: 'button',
				ref: 'button'
			})),
			InkRippleF({
				color: {r: 252, g: 228, b: 236},
				ref: 'ripple'
			})
		);
	}
}

export var ActionButtonF = reactutil.createFactory(ActionButton);

export interface InkRippleProps {
	color: {
		r: number;
		g: number;
		b: number;
	};
}

export interface InkRippleState {
	startX?: number;
	startY?: number;
	active?: boolean;
	width?: number;
	height?: number;
}

/** InkRipple provides a Material Design-style ripple effect when touched or clicked.
  *
  * To use an InkRipple, add it as the child of the element which should display
  * the effect when touched. The ripple will expand to fill its positioned parent.
  */
export class InkRipple extends typed_react.Component<InkRippleProps, InkRippleState> {
	private anim : {
		startTime: number;
		context: CanvasRenderingContext2D;
	};

	getInitialState() {
		return {
			startX: 0,
			startY: 0,
			active: false,
			width: 500,
			height: 500
		};
	}

	componentDidMount() {
		var canvas = <HTMLCanvasElement>(this.refs['canvas'].getDOMNode());
		var container = <HTMLElement>(this.refs['container'].getDOMNode());
		var parentNode = <HTMLElement>(container.parentNode);
		parentNode.addEventListener('mousedown', (e: MouseEvent) => {
			var cx = canvas.getBoundingClientRect().left;
			var cy = canvas.getBoundingClientRect().top;

			var ex: number;
			var ey: number;

			var touchEvent = <TouchEvent>(<Event>e);
			if (touchEvent.touches) {
				ex = touchEvent.touches[0].pageX;
				ey = touchEvent.touches[0].pageY;
			} else {
				ex = e.pageX;
				ey = e.pageY;
			}

			var x = ex - (window.pageXOffset + cx);
			var y = ey - (window.pageYOffset + cy);

			canvas.width = container.offsetWidth;
			canvas.height = container.offsetHeight;

			this.setState({
				active: true,
				startX: x,
				startY: y,
			});

			this.anim = {
				startTime: Date.now(),
				context: canvas.getContext('2d')
			};
			this.stepAnimation();
		});
	}

	componentDidUnmount() {
		this.anim = null;
	}

	render() {
		return react.DOM.div({
			className: style.classes(theme.inkRipple),
			ref: 'container',
			style : {
				width: '100%',
				height: '100%',
				overflow: 'hidden'
			}
		},
			react.DOM.canvas({
				className: style.classes(theme.inkRipple),
				ref: 'canvas',
				width: this.state.width,
				height: this.state.height
			})
		)
	}

	private stepAnimation() {
		if (!this.isMounted()) {
			// component was unmounted during
			// animation
			return;
		}

		var duration = 500;
		var elapsed = Date.now() - this.anim.startTime;
		var radius = elapsed / 3.0;
		var ctx = this.anim.context;

		var alpha = 0.7 - (elapsed / duration);
		var elem = <HTMLCanvasElement>(this.refs['container'].getDOMNode());

		ctx.clearRect(0,0, elem.offsetWidth, elem.offsetHeight);
		ctx.fillStyle = sprintf('rgba(%d,%d,%d,%f)',
		  this.props.color.r, this.props.color.g, this.props.color.b,
		  alpha);
		ctx.beginPath();
		ctx.arc(this.state.startX, this.state.startY, radius, 0, Math.PI * 2, true);
		ctx.fill();

		if (elapsed < duration) {
			window.requestAnimationFrame(() => {
				this.stepAnimation();
			});
		}
	}
}
export var InkRippleF = reactutil.createFactory(InkRipple);

export interface ToasterProps {
	message: string;
	progressValue?: number;
	progressMax?: number;
}

/** Control for displaying a temporary notification,
  * with an optional progress indicator.
  */
export class Toaster extends typed_react.Component<ToasterProps, {}> {
	render() {
		var PROGRESS_WIDTH = 200;
		var meterWidth = (this.props.progressValue / this.props.progressMax) * PROGRESS_WIDTH;

		var progressBar: react.ReactElement<any,any>;
		if (this.props.progressMax) {
			progressBar = react.DOM.div({
					className: style.classes(theme.toaster.progressBar.outline),
					style: {
						width: PROGRESS_WIDTH + 'px'
					}
				},
				react.DOM.div({
					className: style.classes(theme.toaster.progressBar.meter),
					style: { width: meterWidth + 'px' }
				})
			);
		}

		return react.DOM.div({className: style.classes(theme.toaster)},
			react.DOM.div({},
				this.props.message
			),
			progressBar
		);
	}
}

export var ToasterF = reactutil.createFactory(Toaster);

export interface MenuItem {
	label: string;
	onClick: () => void;
}

export interface MenuState {
	showTime?: Date;
}

export interface MenuProps {
	top?: number;
	left?: number;
	right?: number;
	bottom?: number;

	items: MenuItem[];
	onDismiss: () => void;
}

function toPixels(unit: number) {
	if (unit) {
		return unit + 'px';
	} else {
		return undefined;
	}
}

var MENU_DISMISS_EVENTS = ['mousedown', 'touchstart', 'click'];

export class Menu extends typed_react.Component<MenuProps, MenuState> {
	private menuListener: EventListener;

	componentDidMount() {
		var menuNode = <HTMLElement>this.refs['menu'].getDOMNode();

		this.menuListener = (e: MouseEvent) => {
			if (!this.isMounted()) {
				return;
			}

			if (!menuNode.contains(<HTMLElement>e.target)) {
				e.preventDefault();
				this.props.onDismiss();
			}
		};

		MENU_DISMISS_EVENTS.forEach((event) => {
			menuNode.ownerDocument.addEventListener(event, this.menuListener);
		});

		this.setState({showTime: new Date});
	}

	componentWillUnmount() {
		var menuNode = <HTMLElement>this.refs['menu'].getDOMNode();
		MENU_DISMISS_EVENTS.forEach((event) => {
			menuNode.ownerDocument.removeEventListener(event, this.menuListener);
		});
		this.menuListener = null;
	}

	render() {
		var menuItems = this.props.items.map((item) => {
			return react.DOM.div({
				className: style.classes(theme.menu.item),
				key: item.label,
				onClick: () => {
					// when the menu is first opened, ignore any immediate taps that
					// might still be events from the user tapping to open the menu
					var MIN_ITEM_CLICK_DELAY = 500;
					if (Date.now() - this.state.showTime.getTime() < MIN_ITEM_CLICK_DELAY) {
						return;
					}

					setTimeout(() => {
						item.onClick();
						this.props.onDismiss();
					}, 300);
				}
			}, 
				InkRippleF({color: {r: 200, g: 200, b: 200}}),
				item.label
			);
		});
		return react.DOM.div({
			className: style.classes(theme.menu),
			ref: 'menu',
			style: {
				top: toPixels(this.props.top),
				left: toPixels(this.props.left),
				right: toPixels(this.props.right),
				bottom: toPixels(this.props.bottom)
			}
		}, menuItems);
	}
}

export var MenuF = reactutil.createFactory(Menu);

