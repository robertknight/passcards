/// <reference path="../../typings/react-0.12.d.ts" />

import typed_react = require('typed-react');

import controls = require('./controls');
import div = require('../base/div');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');
import theme = require('../theme');

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

var MENU_DISMISS_EVENTS = ['mousedown', 'touchstart', 'click'];

export class Menu extends typed_react.Component<MenuProps, MenuState> {
	private menuListener: EventListener;

	getInitialState() {
		return {
			showTime: new Date
		}
	}

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
			return div(theme.menu.item, {
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
				ripple.InkRippleF({color: {r: 200, g: 200, b: 200}}),
				div(theme.menu.item.label, {}, item.label)
			);
		});

		var visibleMs = Date.now() - this.state.showTime.getTime();

		var maxHeight = menuItems.length * 48;
		var expandedHeight = Math.min(1.0, visibleMs / 300.0) * maxHeight;
		if (expandedHeight < maxHeight) {
			requestAnimationFrame(() => {
				this.forceUpdate();
			});
		}

		var opacity = Math.min(1.0, visibleMs / 200);

		return div(theme.menu, {
			ref: 'menu',
			style: {
				top: this.props.top,
				left: this.props.left,
				right: this.props.right,
				bottom: this.props.bottom,
				height: expandedHeight,
				opacity: opacity
			}
		}, menuItems);
	}
}

export var MenuF = reactutil.createFactory(Menu);

