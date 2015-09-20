/// <reference path="../../typings/react.d.ts" />

import react = require('react');
import typed_react = require('typed-react');
import style = require('ts-style');

import colors = require('./colors');
import fonts = require('./fonts');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');
import style_util = require('../base/style_util');

// http://www.google.co.uk/design/spec/components/menus.html
var theme = style.create({
	menu: {
		position: 'absolute',
		paddingTop: 8,
		paddingBottom: 8,
		boxSizing: 'border-box',
		boxShadow: 'rgba(0, 0, 0, 0.26) 0px 1px 2px 2px',
		backgroundColor: 'white',
		overflowY: 'hidden',
		transform: 'translate3d(0,0,0)',
		transition: style_util.transitionOn({
			opacity: .3,
			transform: .3
		}),

		// container which holds the menu itself and the overlay
		// which covers the background
		container: {
			position: 'absolute',
			left: 0,
			top: 0,
			right: 0,
			bottom: 0
		},

		// overlay which appears behind the menu
		// and intercepts click/touch events to
		// dismiss the menu.
		//
		// On small screens it also serves to
		// dim the background to highlight the menu
		overlay: {
			position: 'fixed',

			left: 0,
			right: 0,
			top: 0,
			bottom: 0,

			backgroundColor: '#000',
			opacity: 0.01,

			transition: style_util.transitionOn({
				opacity: .3
			})
		},

		item: {
			position: 'relative',
			paddingLeft: 16,
			paddingRight: 16,
			fontSize: 16,
			cursor: 'pointer',
			userSelect: 'none',
			verticalAlign: 'middle',
			lineHeight: '48px',
			height: 48,
			textOverflow: 'ellipsis',

			':hover': {
				backgroundColor: colors.MATERIAL_GREY_P200
			},

			label: {
				width: '100%',
				height: '100%',

				// give menu item label its own stacking context so
				// that it renders on top of ripple effect
				transform: 'translate3d(0,0,0)'
			}
		}
	}
});

export interface MenuItem {
	label: string;
	onClick: () => void;
}

interface MenuState {
	document?: Document;
	transition?: reactutil.TransitionState;
	showTime?: Date;
}

export interface MenuProps extends react.Props<void> {
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

	/** Z-index of the menu container. */
	zIndex: number;
}

function measureText(document: Document, text: string, font: string) {
	if (!document) {
		// in non-browser contexts, use a dummy value
		return text.length * 10;
	}

	var HELPER_CANVAS_ID = 'materialMenuCanvas';
	var menuCanvas = <HTMLCanvasElement>document.getElementById(HELPER_CANVAS_ID);
	if (!menuCanvas) {
		menuCanvas = document.createElement('canvas');
		menuCanvas.id = HELPER_CANVAS_ID;
		menuCanvas.style.display = 'none';
		document.body.appendChild(menuCanvas);
	}
	var context = <CanvasRenderingContext2D>menuCanvas.getContext('2d');
	context.font = font;
	return context.measureText(text).width;
}

/** A material-design style menu.
  *
  * See http://www.google.co.uk/design/spec/components/menus.html
  *
  * On small screens, this component automatically
  * displays as a bottom sheet
  * (see http://www.google.co.uk/design/spec/components/bottom-sheets.html)
  *
  * This component must be rendered inside a react.TransitionGroup component
  * for it to be displayed.
  */
export class Menu extends typed_react.Component<MenuProps, MenuState> {
	private transitionListener: reactutil.TransitionEndListener;

	getInitialState() {
		return <MenuState>{
			document: null,
			showTime: new Date,
			transition: reactutil.TransitionState.WillEnter
		}
	}

	private transitionProperty() {
		return this.displayAsSheet() ? 'transform' : 'opacity';
	}

	componentWillEnter(callback: () => void) {
		this.setState({ transition: reactutil.TransitionState.WillEnter });
		setTimeout(() => {
			this.setState({ transition: reactutil.TransitionState.Entering });
		}, 10);

		this.transitionListener = new reactutil.TransitionEndListener(this.refs['menu'], this.transitionProperty(), () => {
			callback();
		});
	}

	componentDidEnter() {
		this.transitionListener.remove();
	}

	componentWillLeave(callback: () => void) {
		this.setState({ transition: reactutil.TransitionState.Leaving });
		this.transitionListener = new reactutil.TransitionEndListener(this.refs['menu'], this.transitionProperty(), () => {
			callback();
		});
	}

	componentDidLeave() {
		this.transitionListener.remove();
	}

	componentDidMount() {
		this.setState({
			document: (<HTMLElement>react.findDOMNode(this)).ownerDocument,
			showTime: new Date
		});
	}

	// returns true if this menu should be displayed
	// as a sheet sliding in from one edge of the app.
	//
	// Referred to as a 'Bottom Sheet' in the Material Design
	// specs
	private displayAsSheet() {
		var SMALL_SCREEN_WIDTH_THRESHOLD = 400;
		return reactutil.rectWidth(this.props.viewportRect) < SMALL_SCREEN_WIDTH_THRESHOLD;
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

		var MENU_ITEM_HEIGHT = 48;
		var VIEWPORT_EDGE_MARGIN = 3;

		var viewRect = this.props.viewportRect;
		var srcRect = {
			left: this.props.sourceRect.left,
			right: this.props.sourceRect.right,
			top: this.props.sourceRect.top,
			bottom: this.props.sourceRect.bottom
		};

		srcRect.left = Math.max(srcRect.left, viewRect.left + VIEWPORT_EDGE_MARGIN);
		srcRect.right = Math.min(srcRect.right, viewRect.right - VIEWPORT_EDGE_MARGIN);
		srcRect.top = Math.max(srcRect.top, viewRect.top + VIEWPORT_EDGE_MARGIN);
		srcRect.bottom = Math.min(srcRect.bottom, viewRect.bottom - VIEWPORT_EDGE_MARGIN);

		var menuRect: reactutil.Rect;
		var expandedHeight = this.props.items.length * MENU_ITEM_HEIGHT;
		expandedHeight += theme.menu.paddingTop + theme.menu.paddingBottom;

		// ideally this should be adjusted to fit the text
		// of menu items
		var menuWidth = 0;
		var itemFont = theme.menu.item.fontSize + 'px ' + fonts.FAMILY;

		this.props.items.forEach((item) => {
			// under Firefox a small amount of extra padding needs to be added
			// to the computed text width to avoid wrapping
			const TEXT_PADDING = 5;
			var itemWidth = measureText(this.state.document, item.label, itemFont) + TEXT_PADDING;
			menuWidth = Math.max(menuWidth, itemWidth);
		});
		menuWidth += theme.menu.item.paddingLeft + theme.menu.item.paddingRight;

		if (this.displayAsSheet()) {
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
			return react.DOM.div(style.mixin(theme.menu.item, {
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
			}),
				ripple.InkRippleF({ radius: 100 }),
				react.DOM.div(style.mixin(theme.menu.item.label), item.label)
				);
		});

		var menuRect = this.getMenuRect();
		var menuOpacity = 0;
		var menuTransform = 'translateY(0px)';
		var enteringOrLeaving = this.state.transition !== reactutil.TransitionState.Entering;

		if (!enteringOrLeaving || this.displayAsSheet()) {
			// menus fade in. Sheets slide in from a screen edge
			menuOpacity = 1.0;
		}

		var overlayStyles: any[] = [theme.menu.overlay];
		if (this.displayAsSheet()) {
			if (!enteringOrLeaving) {
				// see http://www.google.co.uk/design/spec/components/bottom-sheets.html#bottom-sheets-specs
				overlayStyles.push({ opacity: .2 });
			} else {
				menuTransform = 'translateY(' + reactutil.rectHeight(menuRect) + 'px)';
			}
		}

		return react.DOM.div(style.mixin([theme.menu.container, {
			zIndex: this.props.zIndex
		}]),
			react.DOM.div(style.mixin(overlayStyles, {
				onClick: (e: react.MouseEvent) => {
					this.props.onDismiss();
				}
			})),
			react.DOM.div(style.mixin(theme.menu, {
				ref: 'menu',
				style: reactutil.prefix({
					top: menuRect.top,
					left: menuRect.left,
					width: menuRect.right - menuRect.left,
					height: menuRect.bottom - menuRect.top,
					opacity: menuOpacity,
					transform: menuTransform
				}),
			}), menuItems)
			);
	}
}

export var MenuF = reactutil.createFactory(Menu);
