/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import $ = require('jquery');
import react = require('react');
import reactts = require('react-typescript');
import underscore = require('underscore');

import controls = require('./controls');
import keycodes = require('./base/keycodes');
import item_icons = require('./item_icons');
import item_search = require('../lib/item_search');
import stringutil = require('../lib/base/stringutil');
import onepass = require('../lib/onepass');
import url_util = require('../lib/base/url_util');

export class ItemListViewState {
	filter: string;
}

export class ItemListViewProps {
	items: onepass.Item[];
	selectedItem: onepass.Item;
	onSelectedItemChanged: (item: onepass.Item) => void;
	currentUrl: string;
	iconProvider: item_icons.ItemIconProvider;

	onLockClicked: () => void;
}

export class ItemListView extends reactts.ReactComponentBase<ItemListViewProps, ItemListViewState> {
	getInitialState() {
		var state = new ItemListViewState();
		return state;
	}

	componentDidMount() {
		this.focusSearchField();
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
				this.focusSearchField();
			}
		}
	}

	updateFilter = (filter: string) => {
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
			new ItemListToolbar({
				onQueryChanged: this.updateFilter,
				ref: 'searchField',
				onMoveUp: () => {
					(<ItemList>this.refs['itemList']).hoverPrevItem();
				},
				onMoveDown: () => {
					(<ItemList>this.refs['itemList']).hoverNextItem();
				},
				onActivate: () => {
					this.props.onSelectedItemChanged((<ItemList>this.refs['itemList']).hoveredItem());
				},
				onLockClicked: () => this.props.onLockClicked()
			}),
			new ItemList({items: this.props.items, filter: this.state.filter,
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

class ItemProps {
	key: string;
	item: onepass.Item;
	accountName: string;
	domain: string;
	onSelected: () => void;
	isHovered: boolean;
	iconProvider: item_icons.ItemIconProvider;
	index: number;
	offsetTop: number;
}

class Item extends reactts.ReactComponentBase<ItemProps, {}> {
	getInitialState() {
		return {};
	}

	render() {
		return react.DOM.div({
				className: stringutil.truthyKeys({
					itemOverview: true,
					itemHovered: this.props.isHovered,
				}),
				ref: 'itemOverview',
				onClick: () => this.props.onSelected(),
				style: {
					top: (this.props.offsetTop).toString() + 'px'
				}
			},
			new item_icons.IconControl({
				location: this.props.item.location,
				iconProvider: this.props.iconProvider,
			}),
			react.DOM.div({className: 'itemDetails'},
				react.DOM.div({className: 'itemTitle'}, this.props.item.title),
				react.DOM.div({className: 'itemLocation'}, this.props.domain),
				react.DOM.div({className: 'itemAccount'}, this.props.accountName)
			)
		);
	}
}

interface ItemListState {
	// TODO - Remove selected item here
	selectedItem?: onepass.Item;

	hoveredIndex?: number;
	matchingItems?: onepass.Item[];

	visibleIndexes? : {
		first: number;
		last: number;
	};

	itemHeight?: number;
}

class ItemListProps {
	items: onepass.Item[];
	filter: string;
	filterUrl: string;
	onSelectedItemChanged: (item: onepass.Item) => void;
	iconProvider: item_icons.ItemIconProvider;
}

class ItemList extends reactts.ReactComponentBase<ItemListProps, ItemListState> {

	itemAccount(item: onepass.Item) : string {
		// TODO - Extract item contents and save account name
		// for future use
		//
		// In the Agile Keychain format it is only available
		// after the item has been decrypted
		return '';
	}

	setSelectedItem(item: onepass.Item) {
		var state = this.state;
		state.selectedItem = item;
		this.setState(state);
		this.props.onSelectedItemChanged(item);
	}

	getInitialState() {
		return {
			selectedItem: <onepass.Item>null,
			hoveredIndex: 0,
			matchingItems: <onepass.Item[]>[],
			itemHeight: 60
		};
	}

	createListItem(item: onepass.Item, state: {
		hovered: boolean;
		index: number;
		offsetTop: number;
	}) : Item {
		return new Item({
			key: item.uuid,
			item: item,
			accountName: this.itemAccount(item),
			domain: url_util.domain(item.location),
			onSelected: () => {
				this.setSelectedItem(item);
			},
			isHovered: state.hovered,
			iconProvider: this.props.iconProvider,
			ref: item.uuid,
			index: state.index,
			offsetTop: state.offsetTop
		});
	}

	hoverNextItem() {
		if (this.state.hoveredIndex < this.state.matchingItems.length-1) {
			++this.state.hoveredIndex;
			this.setState(this.state);
		}
	}

	hoverPrevItem() {
		if (this.state.hoveredIndex > 0) {
			--this.state.hoveredIndex;
			this.setState(this.state);
		}
	}

	hoveredItem() {
		if (this.state.hoveredIndex < this.state.matchingItems.length) {
			return this.state.matchingItems[this.state.hoveredIndex];
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
					hovered: index == this.state.hoveredIndex,
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
		var prevHoveredItem = this.hoveredItem();
		var matchingItems: onepass.Item[] = [];
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

		var nextHoveredIndex = matchingItems.indexOf(prevHoveredItem);
		if (nextHoveredIndex == -1) {
			nextHoveredIndex = 0;
		}

		this.state.hoveredIndex = nextHoveredIndex;
		this.state.matchingItems = matchingItems;
		this.setState(this.state);
	}
}

class ItemListToolbarProps {
	onQueryChanged: (query: string) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onActivate: () => void;
	
	onLockClicked: () => void;
}

class ItemListToolbar extends reactts.ReactComponentBase<ItemListToolbarProps, {}> {
	componentDidMount() {
		var searchField = this.fieldInput();
		var updateQuery = underscore.debounce(() => {
			this.props.onQueryChanged($(searchField).val().toLowerCase());
		}, 100);
		$(searchField).bind('input', <(eventObject: JQueryEventObject) => any>updateQuery);
		$(searchField).keydown((e) => {
			if (e.which == keycodes.DownArrow) {
				e.preventDefault();
				this.props.onMoveDown();
			} else if (e.which == keycodes.UpArrow) {
				e.preventDefault();
				this.props.onMoveUp();
			} else if (e.which == keycodes.Enter) {
				e.preventDefault();
				this.props.onActivate();
			}
		});
	}

	focus() {
		this.fieldInput().focus();
	}

	blur() {
		this.fieldInput().blur();
	}

	private fieldInput() : HTMLElement {
		return <HTMLElement>this.refs['searchField'].getDOMNode();
	}

	render() {
		var iconViewBox = {
			x: 0,
			y: 0,
			width: 20,
			height: 20
		};

		return react.DOM.div({className: stringutil.truthyKeys({itemListToolbar: true, toolbar: true})},
				new controls.SvgIcon({
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
					ref: 'searchField'
				}),
				new controls.ToolbarButton({
					className: 'toolbarLockIcon',
					iconHref: 'icons/icons.svg#lock-outline',
					onClick: () => this.props.onLockClicked()
				})
			);
	}
}

