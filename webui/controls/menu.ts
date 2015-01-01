/// <reference path="../../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');
import style = require('ts-style');

import controls = require('./controls');
import div = require('../base/div');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');
import theme = require('../theme');

export interface MenuItem {
	label: string;
	onClick: () => void;
}

interface MenuState {
	showTime?: Date;
}

export interface MenuProps {
	/** The source rect of the icon which triggered the
	  * menu.
	  */
	sourceRect: reactutil.Rect;

	/** The viewport within which the menu is being
	  * displayed.
	  */
	viewportRect: reactutil.Rect;

	/** List of menu items to display in the menu. */
	items: MenuItem[];

	/** Callback to invoke when the menu is dismissed. */
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

	private getMenuRect() {
		// On large screens (tablet, desktop), the menu is
		// positioned such that one of the corners is aligned
		// with a corner of the source rect. If space permits,
		// this is the top-left corner. Otherwise one of the
		// other corners is aligned.
		//
		// On small screens (phone), the menu will slide in
		// from one of the edges of the display and use the
		// full width of that edge

		var viewRect = this.props.viewportRect;
		var srcRect = this.props.sourceRect;

		var menuRect: reactutil.Rect;

		var MENU_ITEM_HEIGHT = 48;
		var SMALL_SCREEN_WIDTH_THRESHOLD = 400;

		var expandedHeight = this.props.items.length * MENU_ITEM_HEIGHT;

		// ideally this should be adjusted to fit the text
		// of menu items
		var menuWidth = 150;

		if (reactutil.rectWidth(viewRect) < SMALL_SCREEN_WIDTH_THRESHOLD) {
			// show menu at bottom of display
			menuRect = {
				left: viewRect.left,
				bottom: viewRect.bottom,
				right: viewRect.right,
				top: viewRect.bottom - expandedHeight
			};
		} else {
			var hasSpaceToRight = viewRect.right - srcRect.left > menuWidth;
			var hasSpaceBelow = viewRect.bottom - srcRect.top > expandedHeight;

			if (hasSpaceToRight) {
				if (hasSpaceBelow) {
					// align TL of source rect with TL of menu
					menuRect = {
						top: srcRect.top,
						left: srcRect.left,
						right: srcRect.left + menuWidth,
						bottom: srcRect.top + expandedHeight
					};
				} else {
					// align BL of source rect with BL of menu
					menuRect = {
						top: srcRect.bottom - expandedHeight,
						left: srcRect.left,
						right: srcRect.left + menuWidth,
						bottom: srcRect.bottom
					};
				}
			} else {
				if (hasSpaceBelow) {
					// align TR of source rect with TR of menu
					menuRect = {
						top: srcRect.top,
						left: srcRect.right - menuWidth,
						right: srcRect.right,
						bottom: srcRect.top + expandedHeight
					};
				} else {
					// align BR of source rect with BR of menu
					menuRect = {
						top: srcRect.bottom - expandedHeight,
						left: srcRect.right - menuWidth,
						right: srcRect.right,
						bottom: srcRect.bottom
					};
				}
			}
		}

		return menuRect;
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
				ripple.InkRippleF({radius: 100}),
				div(theme.menu.item.label, {}, item.label)
			);
		});

		var visibleMs = Date.now() - this.state.showTime.getTime();
		var menuRect = this.getMenuRect();

		var expandedHeight = Math.min(1.0, visibleMs / 300.0) * reactutil.rectHeight(menuRect);

		if (expandedHeight < reactutil.rectHeight(menuRect)) {
			reactutil.requestAnimationFrame(() => {
				this.forceUpdate();
			});
		}
		var opacity = Math.min(1.0, visibleMs / 200);

		return div(theme.menu, {
			ref: 'menu',
			style: {
				top: menuRect.top,
				left: menuRect.left,
				width: menuRect.right - menuRect.left,
				height: menuRect.bottom - menuRect.top,
				opacity: opacity
			},
		}, menuItems);
	}
}

export var MenuF = reactutil.createFactory(Menu);

