/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/react-0.12.d.ts" />
/// <reference path="../typings/shallow-equals.d.ts" />

import react = require('react');
import shallow_equals = require('shallow-equals');
import style = require('ts-style');
import typed_react = require('typed-react');
import underscore = require('underscore');

import app_theme = require('./theme');
import colors = require('./controls/colors');
import env = require('../lib/base/env');
import focus_mixin = require('./base/focus_mixin');
import fonts = require('./controls/fonts');
import keycodes = require('./base/keycodes');
import item_icons = require('./item_icons');
import item_search = require('../lib/item_search');
import item_store = require('../lib/item_store');
import reactutil = require('./base/reactutil');
import ripple = require('./controls/ripple');
import svg_icon = require('./controls/svg_icon');
import toolbar = require('./toolbar');

var ITEM_LIST_VIEW_Z_LAYER = 1;

export var theme = style.create({
	toolbar: {
		mixins: [app_theme.mixins.materialDesign.header],

		borderBottom: '1px solid #bbb',
		paddingRight: 20,
		height: 56,
		flexShrink: 0,
		zIndex: app_theme.Z_LAYERS.TOOLBAR,

		width: '100%',
		position: 'fixed',
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',

		searchIcon: {
			marginLeft: 20,
			flexShrink: '0',
			flexGrow: '0'
		},

		searchField: {
			flexGrow: '1',
			paddingLeft: 5,
			marginLeft: 20,
			height: 30,
			border: 0,
			color: colors.MATERIAL_COLOR_HEADER,
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			fontSize: 20,
			outline: 'none',

			/* enable the search field to shrink
			   when the width of the toolbar is collapsed
			   in Firefox
			*/
			overflow: 'hidden',

			'::-webkit-input-placeholder': {
				color: '#fff',
				opacity: '0.8'
			}
		},

		iconGroup: {
			marginLeft: 10,
			marginRight: 10,
			flexShrink: '0',
			flexGrow: '0',
			display: 'flex',
			height: '100%',
			alignItems: 'center'
		},
	},

	container: {
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		position: 'relative',
		zIndex: ITEM_LIST_VIEW_Z_LAYER
	},

	list: {
		marginTop: 56,
		height: '100%',
		backgroundColor: 'white',
		position: 'relative',

		overflow: 'auto',
		overflowScrolling: 'auto',
		WebkitOverflowScrolling: 'touch',

		footer: {
			position: 'absolute',
			color: 'rgba(0,0,0,0)'
		}
	},

	item: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		cursor: 'pointer',
		paddingLeft: 16,
		paddingRight: 5,
		position: 'absolute',
		width: '100%',
		boxSizing: 'border-box',

		// total item height is 72px,
		// 48px icon + 1px border around icon + 11px margin top/bottom
		marginTop: 11,
		marginBottom: 11,

		focusIndicator: {
			position: 'absolute',
			left: 3,
			top: '50%',
			transform: 'translateY(-50%)',
			fontSize: 10,
			opacity: '0.3'
		},

		details: {
			marginLeft: 16,

			title: {
				fontSize: fonts.itemPrimary.size
			},

			account: {
				fontSize: fonts.itemSecondary.size,
				color: colors.MATERIAL_TEXT_SECONDARY
			}
		}
	}
}, __filename);

export interface ToolbarClickEvent {
	itemRect: reactutil.Rect;
}

export class ItemListViewState {
	filter: string;
}

export class ItemListViewProps {
	items: item_store.Item[];
	selectedItem: item_store.Item;
	onSelectedItemChanged: (item: item_store.Item, rect: reactutil.Rect) => void;
	currentUrl: string;
	iconProvider: item_icons.IconProvider;
	focus: boolean;

	onLockClicked: () => void;
	onMenuClicked: (e: ToolbarClickEvent) => void;
}

export class ItemListView extends typed_react.Component<ItemListViewProps, ItemListViewState> {
	getInitialState() {
		var state = new ItemListViewState();
		return state;
	}

	componentDidMount() {
		if (this.props.focus) {
			this.setFocus();
		}
	}

	componentDidUpdate(prevProps: ItemListViewProps) {
		if (!prevProps.focus && this.props.focus) {
			this.setFocus();
		}
	}

	private setFocus() {
		// on the desktop, focus the search field to allow instant searching
		// via the keyboard. On mobile/touch devices we don't do this to avoid
		// immediately obscuring most of the list content with a popup
		// keyboard
		if (!env.isTouchDevice()) {
			this.focusSearchField();
		}
	}

	private updateFilter(filter: string) {
		var state = this.state;
		state.filter = filter;
		this.setState(state);
	}

	render() {
		var filterUrl : string;
		if (!this.state.filter && this.props.currentUrl) {
			filterUrl = this.props.currentUrl;
		}

		return react.DOM.div(style.mixin(theme.container, {
				tabIndex: 0,
				onFocus: () => {
					this.setFocus();
				}
			}),
			ItemListToolbarF({
				filterUrl: this.props.currentUrl,

				onQueryChanged: (query) => {
					this.updateFilter(query)
				},
				ref: 'searchField',
				onMoveUp: () => {
					(<ItemList>this.refs['itemList']).focusPrevItem();
				},
				onMoveDown: () => {
					(<ItemList>this.refs['itemList']).focusNextItem();
				},
				onActivate: () => {
					var itemList = (<ItemList>this.refs['itemList']);
					var focusedItem = itemList.focusedItem();
					var itemRect = itemList.itemRect(focusedItem);
					this.props.onSelectedItemChanged(focusedItem, itemRect);
				},
				onLockClicked: () => this.props.onLockClicked(),
				onMenuClicked: (e) => this.props.onMenuClicked(e)
			}),
			ItemListF({items: this.props.items, filter: this.state.filter,
				filterUrl: filterUrl,
				onSelectedItemChanged: (item, rect) => {
					if (!item) {
						this.focusSearchField();
					}
					this.props.onSelectedItemChanged(item, rect);
				},
				ref: 'itemList',
				iconProvider: this.props.iconProvider
			})
		);
	}

	private focusSearchField() {
		var searchField: ItemListToolbar = <any>this.refs['searchField'];
		searchField.focus();
	}
}

export var ItemListViewF = reactutil.createFactory(ItemListView, focus_mixin.FocusMixinM);

export interface ItemProps {
	key: string;
	item: item_store.Item;
	onSelected: () => void;
	isFocused: boolean;
	iconProvider: item_icons.IconProvider;
	index: number;
	offsetTop: number;
}

export class Item extends typed_react.Component<ItemProps, {}> {
	getInitialState() {
		return {};
	}

	shouldComponentUpdate(nextProps: ItemProps, nextState: {}) {
		// onSelected() is a closure that changes on every render
		// (see createListItem())
		return reactutil.objectChanged(this.props, nextProps, 'onSelected') ||
		       reactutil.objectChanged(this.state, nextState);
	}

	render() {
		var focusIndicator: React.ReactElement<any>;
		if (this.props.isFocused) {
			focusIndicator = react.DOM.div(style.mixin(theme.item.focusIndicator), '>');
		}

		// positioning a rendered item within its parent list could be
		// done via either 'top' or 'transform'.
		//
		// Testing in iOS 8 WebKit/Chrome 39/Firefox 36, both perform
		// similarly in WebKit and Firefox but using translate3d() results
		// in much less pop-in when new items appear in Chrome.
		var offset = this.props.offsetTop.toString() + 'px';
		var translation = 'translate3d(0px,' + offset + ',0px)';

		return react.DOM.div(style.mixin(theme.item, {
				ref: 'itemOverview',
				onClick: () => this.props.onSelected(),
				style: reactutil.prefix({transform: translation})
			}),
			ripple.InkRippleF(),
			item_icons.IconControlF({
				location: this.props.item.primaryLocation(),
				iconProvider: this.props.iconProvider,
				isFocused: this.props.isFocused
			}),
			react.DOM.div(style.mixin(theme.item.details),
				react.DOM.div(style.mixin(theme.item.details.title), this.props.item.title),
				react.DOM.div(style.mixin(theme.item.details.account), this.props.item.account)
			),
			focusIndicator
		);
	}
}
export var ItemF = reactutil.createFactory(Item);

interface ItemListState {
	// TODO - Remove selected item here
	selectedItem?: item_store.Item;

	focusedIndex?: number;
	matchingItems?: item_store.Item[];

	visibleIndexes? : {
		first: number;
		last: number;
	};

	itemHeight?: number;
}

class ItemListProps {
	items: item_store.Item[];
	filter: string;
	filterUrl: string;
	onSelectedItemChanged: (item: item_store.Item, rect: reactutil.Rect) => void;
	iconProvider: item_icons.IconProvider;
}

class ItemList extends typed_react.Component<ItemListProps, ItemListState> {

	setSelectedItem(item: item_store.Item, rect: reactutil.Rect) {
		var state = this.state;
		state.selectedItem = item;
		this.setState(state);
		this.props.onSelectedItemChanged(item, rect);
	}

	getInitialState() {
		return {
			selectedItem: <item_store.Item>null,
			focusedIndex: 0,
			matchingItems: <item_store.Item[]>[],
			itemHeight: 60
		};
	}

	createListItem(item: item_store.Item, state: {
		focused: boolean;
		index: number;
		offsetTop: number;
	}) : React.ReactElement<ItemProps> {
		return ItemF({
			key: item.uuid,
			item: item,
			onSelected: () => {
				this.setSelectedItem(item, this.itemRect(item));
			},
			isFocused: state.focused,
			iconProvider: this.props.iconProvider,
			ref: item.uuid,
			index: state.index,
			offsetTop: state.offsetTop
		});
	}

	focusNextItem() {
		if (this.state.focusedIndex < this.state.matchingItems.length-1) {
			++this.state.focusedIndex;
			this.setState(this.state);

			if (this.isMounted()) {
				this.ensureItemVisible(this.state.focusedIndex);
			}
		}
	}

	focusPrevItem() {
		if (this.state.focusedIndex > 0) {
			--this.state.focusedIndex;
			this.setState(this.state);

			if (this.isMounted()) {
				this.ensureItemVisible(this.state.focusedIndex);
			}
		}
	}

	private ensureItemVisible(index: number) {
		var scrollDelta = 0;
		if (this.state.focusedIndex <= this.state.visibleIndexes.first) {
			scrollDelta = this.state.focusedIndex - this.state.visibleIndexes.first - 1;
		} else if (this.state.focusedIndex >= this.state.visibleIndexes.last) {
			scrollDelta = this.state.visibleIndexes.last - this.state.focusedIndex + 1;
		}
		this.scrollList(scrollDelta);
	}

	private scrollList(count: number) {
		var itemList = <HTMLElement>this.refs['itemList'].getDOMNode();
		itemList.scrollTop += this.state.itemHeight * count;
	}

	focusedItem() {
		if (this.state.focusedIndex < this.state.matchingItems.length) {
			return this.state.matchingItems[this.state.focusedIndex];
		}
		return null;
	}

	itemRect(item: item_store.Item) : reactutil.Rect {
		var itemRef = this.refs[item.uuid];
		if (!itemRef) {
			return null;
		}

		var rect = itemRef.getDOMNode().getBoundingClientRect();
		return {
			left: rect.left,
			top: rect.top,
			bottom: rect.bottom,
			right: rect.right
		};
	}

	componentDidMount() {
		this.updateMatchingItems(this.props);
	}

	componentWillReceiveProps(nextProps: ItemListProps) {
		if (!shallow_equals(this.props.items, nextProps.items) ||
		    this.props.filter !== nextProps.filter ||
			this.props.filterUrl !== nextProps.filterUrl) {
			this.updateMatchingItems(nextProps);
		}
	}

	render() {
		var renderedIndexes = this.renderedIndexes();
		var listItems = this.state.matchingItems.map((item, index) => {
			var isVisible = index >= renderedIndexes.first &&
				            index <= renderedIndexes.last;
			if (isVisible) {
				return this.createListItem(item, {
					focused: index == this.state.focusedIndex,
					index: index,
					offsetTop: index * this.state.itemHeight
				});
			} else {
				return null;
			}
		}).filter((item) => {
			return item != null;
		});
			
		var listHeight = this.state.matchingItems.length * this.state.itemHeight;
		return react.DOM.div(style.mixin(theme.list, {
			ref: 'itemList',
			onScroll: () => {
				// In iOS 8 multiple scroll events may be delivered
				// in a single animation frame. Aside from avoiding unnecessary
				// updates, buffering these avoids flicker in Mobile Safari when
				// scrolling the list.
				//
				// Use of rAF() does not appear to be necessary in Firefox and Chrome.
				if (env.isChromeExtension()) {
					// rAF() is not needed in Chrome and is not invoked
					// when called in the context of a background page of a Chrome
					// extension, so just call updateVisibleItems() directly.
					this.updateVisibleItems();
				} else {
					window.requestAnimationFrame(() => {
						this.updateVisibleItems();
					});
				}
			}
		}),
			listItems,

			// add placeholder item at the bottom of the list to ensure
			// that the scrollbar has a suitable range to allow the user
			// to scroll the whole list
			react.DOM.div(style.mixin([theme.list.footer, {
				top: listHeight.toString()
			}]), 'placeholder')
		);
	}

	private updateVisibleItems() {
		var itemList = <HTMLElement>this.refs['itemList'].getDOMNode();
		if (this.state.matchingItems.length > 0) {
			var topIndex: number = -1;
			var bottomIndex: number = -1;

			var itemListRect = {
				top: itemList.scrollTop,
				bottom: itemList.scrollTop + itemList.getBoundingClientRect().height
			};

			for (var i=0; i < this.state.matchingItems.length; i++) {
				var itemRect = {
					top: i * this.state.itemHeight,
					bottom: (i * this.state.itemHeight) + this.state.itemHeight
				};

				if (topIndex == -1 && itemRect.bottom >= itemListRect.top) {
					topIndex = i;
				}
				if (topIndex != -1) {
					bottomIndex = i;
				}

				if (itemRect.bottom > itemListRect.bottom) {
					break;
				}
			}

			if (!this.state.visibleIndexes ||
			     topIndex != this.state.visibleIndexes.first ||
				 bottomIndex != this.state.visibleIndexes.last) {
				this.setState({
					visibleIndexes: {
						first: topIndex,
						last: bottomIndex
					}
				});
			}
		}
	}

	// returns the range of indexes of items to render in the list,
	// given the currently visible indexes.
	//
	// We render more items than are visible to reducing 'popping in'
	// of items into the view after scrolling in browsers which
	// do asynchronous scrolling (iOS Safari, Chrome, likely future
	// Firefox)
	private renderedIndexes() {
		if (!this.state.visibleIndexes) {
			return { first: 0, last: 0 };
		}

		var runway = 10;
		return {
			first: Math.max(0, this.state.visibleIndexes.first - runway),
			last: Math.min(this.state.matchingItems.length-1, this.state.visibleIndexes.last + runway)
		};
	}

	private updateMatchingItems(props: ItemListProps) {
		var prevFocusedIndex = this.focusedItem();
		var matchingItems: item_store.Item[] = [];
		var matchesAreSorted = false;

		if (props.filter) {
			matchingItems = underscore.filter(props.items, (item) => {
				return item_search.matchItem(item, props.filter);
			});
		} else if (props.filterUrl) {
			matchingItems = item_search.filterItemsByUrl(props.items, props.filterUrl);
			if (matchingItems.length > 0) {
				matchesAreSorted = true;
			} else {
				// if no items appear to match this URL, show the
				// complete list and let the user browse or filter
				matchingItems = props.items;
			}
		} else {
			matchingItems = props.items;
		}

		if (!matchesAreSorted) {
			matchingItems.sort((a, b) => {
				return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
			});
		}

		var nextFocusedIndex = matchingItems.indexOf(prevFocusedIndex);
		if (nextFocusedIndex == -1) {
			nextFocusedIndex = 0;
		}

		this.state.focusedIndex = nextFocusedIndex;
		this.state.matchingItems = matchingItems;
		this.setState(this.state);

		this.updateVisibleItems();
	}
}

export var ItemListF = reactutil.createFactory(ItemList);

class ItemListToolbarProps {
	filterUrl: string;

	onQueryChanged: (query: string) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onActivate: () => void;

	onLockClicked: () => void;
	onMenuClicked: (e: ToolbarClickEvent) => void;
}

class ItemListToolbar extends typed_react.Component<ItemListToolbarProps, {}> {
	focus() {
		this.fieldInput().focus();
	}

	blur() {
		this.fieldInput().blur();
	}

	private fieldInput() {
		return <HTMLInputElement>this.refs['searchField'].getDOMNode();
	}

	render() {
		var iconViewBox = {
			x: 0,
			y: 0,
			width: 20,
			height: 20
		};

		var updateQuery = underscore.debounce(() => {
			this.props.onQueryChanged(this.fieldInput().value.toLowerCase());
		}, 100);

		var searchPlaceholder: string;
		if (this.props.filterUrl) {
			searchPlaceholder = 'Search all items...';
		} else {
			searchPlaceholder = 'Search items...';
		}

		return react.DOM.div(style.mixin(theme.toolbar),
				svg_icon.SvgIconF({
					className: style.classes(theme.toolbar.searchIcon),
					href: 'dist/icons/icons.svg#search',
					width: 20,
					height: 20,
					viewBox: iconViewBox,
					fill: 'white'
				}),
				react.DOM.input({className: style.classes(theme.toolbar.searchField),
					type: 'text',
					placeholder: searchPlaceholder,
					ref: 'searchField',
					onKeyDown: (e) => {
						this.handleSearchFieldKey(e);
					},
					onInput: (e) => {
						updateQuery();
					}
				}),
				react.DOM.div(style.mixin(theme.toolbar.iconGroup),
					toolbar.createButton({
						iconUrl: 'dist/icons/icons.svg#lock-outline',
						value: 'Lock',
						onClick: () => this.props.onLockClicked()
					}),
					toolbar.createButton({
						iconUrl: 'dist/icons/icons.svg#menu',
						value: 'Menu',
						ref: 'menuButton',
						onClick: () => {
							var event = {
								itemRect: (<HTMLElement>this.refs['menuButton'].getDOMNode()).getBoundingClientRect()
							};
							this.props.onMenuClicked(event);
						}
					})
				)
			);
	}

	private handleSearchFieldKey(e: React.KeyboardEvent) {
		var handled = true;
		if (e.which == keycodes.DownArrow) {
			this.props.onMoveDown();
		} else if (e.which == keycodes.UpArrow) {
			this.props.onMoveUp();
		} else if (e.which == keycodes.Enter) {
			this.props.onActivate();
		} else {
			handled = false;
		}
		if (handled) {
			e.preventDefault();
		}
	}
}

export var ItemListToolbarF = reactutil.createFactory(ItemListToolbar);
