/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');
import underscore = require('underscore');

import controls = require('./controls');
import env = require('../lib/base/env');
import keycodes = require('./base/keycodes');
import item_icons = require('./item_icons');
import item_search = require('../lib/item_search');
import item_store = require('../lib/item_store');
import reactutil = require('./reactutil');
import stringutil = require('../lib/base/stringutil');
import url_util = require('../lib/base/url_util');

export class ItemListViewState {
	filter: string;
}

export class ItemListViewProps {
	items: item_store.Item[];
	selectedItem: item_store.Item;
	onSelectedItemChanged: (item: item_store.Item) => void;
	currentUrl: string;
	iconProvider: item_icons.ItemIconProvider;

	onLockClicked: () => void;
	onMenuClicked: () => void;
}

export class ItemListView extends typed_react.Component<ItemListViewProps, ItemListViewState> {
	getInitialState() {
		var state = new ItemListViewState();
		return state;
	}

	componentDidMount() {
		// on the desktop, focus the search field to allow instant searching
		// via the keyboard. On mobile/touch devices we don't do this to avoid
		// immediately obscuring most of the list content with a popup
		// keyboard
		if (!env.isTouchDevice()) {
			this.focusSearchField();
		}
	}

	componentWillReceiveProps(nextProps: ItemListViewProps) {
		if (this.refs['searchField']) {
			if (nextProps.selectedItem) {
				// blur search field to allow keyboard navigation of selected
				// item
				setTimeout(() => {
					this.blurSearchField();
				}, 0);
			} else {
				// no item selected, focus search field to allow item list navigation
				// via keyboard
				if (!env.isTouchDevice()) {
					this.focusSearchField();
				}
			}
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

		return react.DOM.div({className: 'itemListView'},
			ItemListToolbarF({
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
					this.props.onSelectedItemChanged((<ItemList>this.refs['itemList']).focusedItem());
				},
				onLockClicked: () => this.props.onLockClicked(),
				onMenuClicked: () => this.props.onMenuClicked()
			}),
			ItemListF({items: this.props.items, filter: this.state.filter,
				filterUrl: filterUrl,
				onSelectedItemChanged: (item) => {
					if (!item) {
						this.focusSearchField();
					}
					this.props.onSelectedItemChanged(item);
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

	private blurSearchField() {
		var searchField: ItemListToolbar = <any>this.refs['searchField'];
		searchField.blur();
	}
}
export var ItemListViewF = reactutil.createFactory(ItemListView);

class ItemProps {
	key: string;
	item: item_store.Item;
	domain: string;
	onSelected: () => void;
	isFocused: boolean;
	iconProvider: item_icons.ItemIconProvider;
	index: number;
	offsetTop: number;
}

class Item extends typed_react.Component<ItemProps, {}> {
	getInitialState() {
		return {};
	}

	render() {
		var focusIndicator: react.Descriptor<any>;
		if (this.props.isFocused) {
			focusIndicator = react.DOM.div({className: 'itemFocusIndicator'}, '>');
		}

		return react.DOM.div({
				className: stringutil.truthyKeys({
					itemOverview: true,
					itemFocused: this.props.isFocused,
				}),
				ref: 'itemOverview',
				onClick: () => this.props.onSelected(),
				style: {
					top: (this.props.offsetTop).toString() + 'px'
				}
			},
			controls.InkRippleF({
				color: {
					r: 252,
					g: 228,
					b: 236
				}
			}),
			item_icons.IconControlF({
				location: this.props.item.primaryLocation(),
				iconProvider: this.props.iconProvider,
				isFocused: this.props.isFocused
			}),
			react.DOM.div({className: 'itemDetails'},
				react.DOM.div({className: 'itemTitle'}, this.props.item.title),
				react.DOM.div({className: 'itemAccount'}, this.props.item.account)
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
	onSelectedItemChanged: (item: item_store.Item) => void;
	iconProvider: item_icons.ItemIconProvider;
}

class ItemList extends typed_react.Component<ItemListProps, ItemListState> {

	setSelectedItem(item: item_store.Item) {
		var state = this.state;
		state.selectedItem = item;
		this.setState(state);
		this.props.onSelectedItemChanged(item);
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
	}) : react.Descriptor<ItemProps> {
		return ItemF({
			key: item.uuid,
			item: item,
			domain: url_util.domain(url_util.normalize(item.primaryLocation())),
			onSelected: () => {
				this.setSelectedItem(item);
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

	componentDidMount() {
		this.updateMatchingItems(this.props);
		this.updateVisibleItems();
	}

	componentDidUpdate() {
		this.updateVisibleItems();
	}

	componentWillReceiveProps(nextProps: ItemListProps) {
		this.updateMatchingItems(nextProps);
	}

	render() {
		var listItems = this.state.matchingItems.map((item, index) => {
			var isVisible = false;
			if (this.state.visibleIndexes) {
				isVisible = index >= this.state.visibleIndexes.first &&
				            index <= this.state.visibleIndexes.last;
			}
			if (isVisible) {
				return this.createListItem(item, {
					focused: index == this.state.focusedIndex,
					index: index,
					offsetTop: index * this.state.itemHeight
				});
			} else {
				return null;
			}
		});

		var listHeight = this.state.matchingItems.length * this.state.itemHeight;
		return react.DOM.div({
			className: 'itemList',
			ref: 'itemList',
			onScroll: (e) => {
				this.updateVisibleItems()
			}
		},
			listItems,

			// add placeholder item at the bottom of the list to ensure
			// that the scrollbar has a suitable range to allow the user
			// to scroll the whole list
			react.DOM.div({
				className: 'itemListFooter',
				style: {
					top: listHeight.toString() + 'px'
				}
			}, 'placeholder')
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
	}
}

export var ItemListF = reactutil.createFactory(ItemList);

class ItemListToolbarProps {
	onQueryChanged: (query: string) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onActivate: () => void;

	onLockClicked: () => void;
	onMenuClicked: () => void;
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

		return react.DOM.div({className: stringutil.truthyKeys({itemListToolbar: true, toolbar: true})},
				controls.SvgIconF({
					className: 'toolbarSearchIcon',
					href: 'icons/icons.svg#search',
					width: 20,
					height: 20,
					viewBox: iconViewBox,
					fill: 'white'
				}),
				react.DOM.input({className: 'searchFieldInput',
					type: 'text',
					placeholder: 'Search items...',
					ref: 'searchField',
					onKeyDown: (e) => {
						this.handleSearchFieldKey(e);
					},
					onInput: (e) => {
						updateQuery();
					}
				}),
				react.DOM.div({className: 'toolbarIconGroup'},
					controls.ToolbarButtonF({
						className: 'toolbarLockIcon',
						iconHref: 'icons/icons.svg#lock-outline',
						onClick: () => this.props.onLockClicked()
					}),
					controls.ToolbarButtonF({
						className: 'toolbarMenuIcon',
						iconHref: 'icons/icons.svg#menu',
						onClick: () => this.props.onMenuClicked()
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
