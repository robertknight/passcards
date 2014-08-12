/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />
/// <reference path="../typings/fastclick.d.ts" />

import $ = require('jquery');
import fastclick = require('fastclick');
import Q = require('q');
import react = require('react');
import reactts = require('react-typescript');
import url = require('url');
import underscore = require('underscore');

import autofill = require('./autofill');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import key_agent = require('../lib/key_agent');
import key_value_store = require('../lib/base/key_value_store');
import http_vfs = require('../lib/vfs/http');
import item_icons = require('./item_icons');
import item_search = require('../lib/item_search');
import onepass = require('../lib/onepass');
import page_access = require('./page_access');
import shortcut = require('./base/shortcut');
import stringutil = require('../lib/base/stringutil');
import vfs = require('../lib/vfs/vfs');

import onepass_crypto = require('../lib/onepass_crypto');

/** Converts a map of (component name -> unmounted React component)
  * into an array of components where the map key is set
  * as the 'key' attribute of the component's props.
  *
  * The ordering of the components in the result array is arbitrary.
  */
function mapToComponentArray(map: Object) {
	var ary: Array<react.ReactComponent<any,any>> = [];
	Object.keys(map).forEach((k) => {
		var child = (<any>map)[k];
		child.props.key = k;
		ary.push(child);
	});
	return ary;
}

enum ActiveView {
	UnlockPane,
	ItemList,
	ItemDetailView
}

enum StatusType {
	Error
}

class Status {
	type: StatusType;
	text: string;
}

class StatusViewProps {
	status: Status;
}

/** A status bar for showing app-wide notifications, such
  * as syncing progress, connection errors etc.
  */
class StatusView extends reactts.ReactComponentBase<StatusViewProps, {}> {
	render() {
		return react.DOM.div({className: 'statusView'},
			this.props.status ? this.props.status.text : ''
		);
	}
}

/** The app setup screen. This is responsible for introducing the user
  * to the app and displaying the initial status page when connecting
  * to cloud storage.
  */
class SetupView extends reactts.ReactComponentBase<{}, {}> {
	render() {
		return react.DOM.div({className: 'setupView'},
			react.DOM.div({className: 'loginText'},
				'Connecting to Dropbox...'
			)
		);
	}
}

class AppViewState {
	mainView: ActiveView;
	vault: onepass.Vault;
	items: onepass.Item[];
	selectedItem: onepass.Item;
	isLocked: boolean;
	currentUrl: string;
	status: Status;
}

interface AppServices {
	autofiller: autofill.AutoFillHandler;
	iconProvider: item_icons.ItemIconProvider;
}

interface AppViewProps {
	services: AppServices;
}

/** The main top-level app view. */
class AppView extends reactts.ReactComponentBase<AppViewProps, AppViewState> {
	constructor(props: AppViewProps) {
		super(props);

		// trigger a refresh of the item list when the view
		// loses focus.
		//
		// It would be preferable to set up a long-poll or
		// other notification to the cloud sync service to
		// pick up changes without requiring the user
		// to hide and re-show the view
		document.addEventListener('blur', () => {
			this.refreshItems();
		});
	}

	getInitialState() {
		var state = new AppViewState;
		state.mainView = ActiveView.UnlockPane;
		state.items = [];
		state.isLocked = true;
		return state;
	}

	setVault(vault: onepass.Vault) {
		var state = this.state;
		state.vault = vault;
		this.setState(state);

		this.refreshItems();
	}

	refreshItems() {
		if (!this.state.vault) {
			return;
		}
		this.state.vault.listItems().then((items) => {
			var state = this.state;
			state.items = items;
			this.setState(state);
		});
	}

	setSelectedItem(item: onepass.Item) {
		var state = this.state;
		state.selectedItem = item;
		this.setState(state);
	}

	setCurrentUrl(url: string) {
		console.log('current URL set to', url);

		var state = this.state;
		state.currentUrl = url;

		// switch back to the main item
		// list when the current page changes
		state.selectedItem = null;

		this.setState(state);
	}

	setLocked(locked: boolean) {
		var state = this.state;
		state.isLocked = locked;
		if (locked) {
			state.selectedItem = null;
		}
		this.setState(state);
	}

	showError(error: string) {
		var state = this.state;
		state.status = {type: StatusType.Error, text: error};
		this.setState(state);
	}

	autofill(item: onepass.Item) {
		this.props.services.autofiller.autofill(item);
	}

	render() {
		var children : {
			unlockPane?: UnlockPane;
			itemList?: ItemListView;
			itemDetails?: DetailsView;
			statusView?: StatusView;
		} = {};

		if (this.state.isLocked) {
			children.unlockPane = new UnlockPane({
				vault: this.state.vault,
				isLocked: this.state.isLocked,
				onUnlock: () => {
					this.setLocked(false);
				},
				onUnlockErr: (err) => {
					this.showError(err);
				}
			});
		} else {
			children.itemList = new ItemListView({
				items: this.state.items,
				selectedItem: this.state.selectedItem,
				onSelectedItemChanged: (item) => { this.setSelectedItem(item); },
				currentUrl: this.state.currentUrl,
				iconProvider: this.props.services.iconProvider
			});
			children.itemDetails = new DetailsView({
				item: this.state.selectedItem,
				iconProvider: this.props.services.iconProvider,
				onGoBack: () => {
					this.setSelectedItem(null);
				},
				autofill: () => {
					this.autofill(this.state.selectedItem);
				}
			});
		}
		if (this.state.status) {
			children.statusView = new StatusView({
				status: this.state.status
			});
		}

		return react.DOM.div({className: 'appView'},
			mapToComponentArray(children)
		);
	}
}

// View for entering master password and unlocking the vault
enum UnlockState {
	Locked,
	Unlocking,
	Failed,
	Success
}

class UnlockPaneState {
	unlockState: UnlockState;
}

class UnlockPaneProps {
	vault: onepass.Vault;
	isLocked: boolean;
	onUnlock: () => void;
	onUnlockErr: (error: string) => void;
}

class UnlockPane extends reactts.ReactComponentBase<UnlockPaneProps, UnlockPaneState> {
	getInitialState() {
		return new UnlockPaneState();
	}

	componentDidMount() {
		var unlockForm = this.refs['unlockPaneForm'].getDOMNode();
		$(unlockForm).submit((e) => {
			e.preventDefault();

			var unlockField = this.refs['masterPassField'].getDOMNode();
			var masterPass = $(unlockField).val();

			this.setUnlockState(UnlockState.Unlocking);
			this.props.vault.unlock(masterPass).then(() => {
				this.setUnlockState(UnlockState.Success);
				this.props.onUnlock();
			})
			.fail((err) => {
				this.setUnlockState(UnlockState.Failed);
				this.props.onUnlockErr(err);
			});
		});

		var masterPassField = this.refs['masterPassField'].getDOMNode();
		$(masterPassField).focus();
	}

	setUnlockState(unlockState: UnlockState) {
		var state = this.state;
		state.unlockState = unlockState;
		this.setState(state);
	}

	render() {
		if (!this.props.isLocked) {
			return react.DOM.div({});
		}

		var unlockMessage : string;
		if (this.state.unlockState == UnlockState.Unlocking) {
			unlockMessage = 'Unlocking...';
		} else if (this.state.unlockState == UnlockState.Failed) {
			unlockMessage = 'Unlocking failed';
		}

		return react.DOM.div({className: 'unlockPane'},
			react.DOM.div({className:'unlockPaneForm'},
				react.DOM.form({className: 'unlockPaneInputs', ref:'unlockPaneForm'},
					react.DOM.input({
						className: 'masterPassField',
						type: 'password',
						placeholder: 'Master Password...',
						ref: 'masterPassField',
						autoFocus: true
					}),
					react.DOM.input({type: 'submit', value: 'Unlock', ref: 'unlockBtn'})
				),
				react.DOM.div({className: 'unlockLabel'}, unlockMessage)
			)
		);
	}
}

// Search box to search through items in the view
class SearchFieldProps {
	onQueryChanged: (query: string) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onActivate: () => void;
}

class SearchField extends reactts.ReactComponentBase<SearchFieldProps, {}> {
	componentDidMount() {
		var searchField = this.fieldInput();
		var updateQuery = underscore.debounce(() => {
			this.props.onQueryChanged($(searchField).val().toLowerCase());
		}, 100);
		$(searchField).bind('input', <(eventObject: JQueryEventObject) => any>updateQuery);
		$(searchField).keydown((e) => {
			if (e.key == 'Down') {
				e.preventDefault();
				this.props.onMoveDown();
			} else if (e.key == 'Up') {
				e.preventDefault();
				this.props.onMoveUp();
			} else if (e.key == 'Enter') {
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
		return react.DOM.div({className: stringutil.truthyKeys({searchField: true, toolbar: true})},
				react.DOM.input({className: 'searchFieldInput',
					type: 'text',
					placeholder: 'Search...',
					ref: 'searchField'
				})
			);
	}
}

class ItemListViewState {
	filter: string;
}

class ItemListViewProps {
	items: onepass.Item[];
	selectedItem: onepass.Item;
	onSelectedItemChanged: (item: onepass.Item) => void;
	currentUrl: string;
	iconProvider: item_icons.ItemIconProvider;
}

class ItemListView extends reactts.ReactComponentBase<ItemListViewProps, ItemListViewState> {
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
			new SearchField({
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
				}
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
		var searchField: SearchField = <any>this.refs['searchField'];
		searchField.focus();
	}

	private blurSearchField() {
		var searchField: SearchField = <any>this.refs['searchField'];
		searchField.blur();
	}
}

// Detail view for an individual item
class DetailsViewProps {
	item: onepass.Item;
	iconProvider: item_icons.ItemIconProvider;

	onGoBack: () => any;
	autofill: () => void;
}

class ItemSectionProps {
	title: string;
	type: onepass.FormFieldType
	value: string;
}

class DetailsView extends reactts.ReactComponentBase<DetailsViewProps, {}> {
	private itemContent : onepass.ItemContent;
	private shortcuts: shortcut.Shortcut[];
	private iconUpdateListener: (url: string) => void;

	// FIXME - This is duplicated for the Item component
	private setupIconUpdateListener(iconProvider: item_icons.ItemIconProvider) {
		if (!this.iconUpdateListener) {
			this.iconUpdateListener = (url) => {
				if (this.props.item && this.props.iconProvider.updateMatches(url, this.props.item.location)) {
					this.forceUpdate();
				}
			};
		}
		if (this.props.iconProvider) {
			this.props.iconProvider.updated.ignore(this.iconUpdateListener);
		}
		iconProvider.updated.listen(this.iconUpdateListener);
	}

	componentWillReceiveProps(nextProps: DetailsViewProps) {
		if (!nextProps.item) {
			return;
		}

		if (!this.props.item || this.props.item != nextProps.item) {
			// forget previous item content when switching items
			this.itemContent = null;
		}

		nextProps.item.getContent().then((content) => {
			// TODO - Cache content and avoid using forceUpdate()
			this.itemContent = content;
			this.forceUpdate();
		}).done();

		this.setupIconUpdateListener(nextProps.iconProvider);
	}

	componentDidUpdate() {
		this.updateShortcutState();
	}

	componentDidMount() {
		$(this.refs['backLink'].getDOMNode()).click(() => {
			this.props.onGoBack();
		});
		$(this.refs['autofillBtn'].getDOMNode()).click(() => {
			this.props.autofill();
		});

		this.shortcuts = [
			new shortcut.Shortcut('Backspace', () => {
				this.props.onGoBack();
			}),
			new shortcut.Shortcut('a', () => {
				this.props.autofill();
			})
		];
		this.updateShortcutState();
		this.setupIconUpdateListener(this.props.iconProvider);
	}

	componentDidUnmount() {
		this.shortcuts.forEach((shortcut) => {
			shortcut.remove();
		});
		this.shortcuts = [];
	}

	private updateShortcutState() {
		this.shortcuts.forEach((shortcut) => {
			shortcut.setEnabled(this.props.item != null);
		});
	}

	render() {
		var detailsContent : react.ReactComponent<any,any>;
		if (this.props.item && this.itemContent) {
			var account = this.itemContent.account();
			var password = this.itemContent.password();
			var coreFields: react.ReactComponent<any,any>[] = [];
			var websites: react.ReactComponent<any,any>[] = [];
			var sections: react.ReactComponent<any,any>[] = [];

			this.itemContent.sections.forEach((section) => {
				var fields: react.ReactComponent<any,any>[] = [];
				section.fields.forEach((field) => {
					if (field.value) {
						fields.push(react.DOM.div({className: 'detailsField'},
							react.DOM.div({className: 'detailsFieldLabel'}, field.title),
							react.DOM.div({className: 'detailsFieldValue'}, field.value)
						));
					}
				});
				sections.push(react.DOM.div({className: 'detailsSection'},
					fields)
				);
			});

			this.itemContent.urls.forEach((url) => {
				websites.push(react.DOM.div({className: 'detailsField'},
					react.DOM.div({className: 'detailsFieldLabel'}, url.label),
					react.DOM.div({className: 'detailsFieldValue'}, url.url)
				));
			});

			if (account) {
				coreFields.push(react.DOM.div({className: 'detailsField detailsAccount'},
					react.DOM.div({className: 'detailsFieldLabel'}, 'Account'),
					react.DOM.div({}, account))
				);
			}

			if (password) {
				coreFields.push(react.DOM.div({className: 'detailsField detailsPass'},
					react.DOM.div({className: 'detailsFieldLabel'}, 'Password'),
					react.DOM.div({}, password))
				);
			}

			var iconUrl = this.props.iconProvider.query(this.props.item.location).iconUrl;
			detailsContent = react.DOM.div({className: 'detailsContent'},
				react.DOM.div({className: 'detailsHeader'},
					react.DOM.img({className: 'detailsHeaderIcon itemIcon', src: iconUrl}),
					react.DOM.div({},
						react.DOM.div({className: 'detailsTitle'}, this.props.item.title),
						react.DOM.div({className: 'detailsLocation'}, this.props.item.location))
				),
				react.DOM.div({className: 'detailsCore'},
					coreFields),
				react.DOM.div({className: 'detailsURLs'},
					websites),
				react.DOM.div({className: 'detailsSections'},
					sections)
			);
		}

		return react.DOM.div({
			className: stringutil.truthyKeys({
					detailsView: true,
					hasSelectedItem: this.props.item
				}),
			ref: 'detailsView',
			tabIndex: 0
			},
			react.DOM.div({className: stringutil.truthyKeys({toolbar: true, detailsToolbar: true})},
				react.DOM.a({className: 'toolbarLink', href:'#', ref:'backLink'}, 'Back')),
				react.DOM.div({className: 'itemActionBar'},
						react.DOM.input({className: 'itemActionButton', accessKey:'a', type: 'button', value: 'Autofill', ref: 'autofillBtn'})
				),
			detailsContent ? detailsContent : []
		);
	}
}

// Item in the overall view
interface ItemState {
}

class ItemProps {
	key: string;
	title: string;
	accountName: string;
	location: string;
	domain: string;
	onSelected: () => void;
	isHovered: boolean;
	iconProvider: item_icons.ItemIconProvider;
	visible: boolean;
}

class Item extends reactts.ReactComponentBase<ItemProps, ItemState> {
	private iconUpdateListener: (url: string) => void;

	private setupIconUpdateListener(iconProvider: item_icons.ItemIconProvider) {
		if (!this.iconUpdateListener) {
			this.iconUpdateListener = (url) => {
				if (this.isMounted() && this.props.iconProvider.updateMatches(url, this.props.location)) {
					this.forceUpdate();
				}
			};
		}
		if (this.props.iconProvider) {
			this.props.iconProvider.updated.ignore(this.iconUpdateListener);
		}
		iconProvider.updated.listen(this.iconUpdateListener);
	}

	getInitialState() {
		return {};
	}

	componentDidMount() {
		$(this.refs['itemOverview'].getDOMNode()).click(() => {
			this.props.onSelected();
		});
		if (!this.iconUpdateListener) {
			this.setupIconUpdateListener(this.props.iconProvider);
		}
	}

	componentWillReceiveProps(nextProps: ItemProps) {
		this.setupIconUpdateListener(nextProps.iconProvider);
	}

	render() {
		var iconUrl: string;
		if (this.props.visible) {
			iconUrl = this.props.iconProvider.query(this.props.location).iconUrl;
		} else {
			iconUrl = '';
		}

		return react.DOM.div({className: stringutil.truthyKeys({itemOverview: true,
				itemHovered: this.props.isHovered,
				itemVisible: this.props.visible}), ref: 'itemOverview'},
			react.DOM.div({className: 'itemIconContainer'},
				react.DOM.img({className: 'itemIcon', src: iconUrl})
			),
			react.DOM.div({className: 'itemDetails'},
				react.DOM.div({className: 'itemTitle'}, this.props.title),
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
		};
	}

	createListItem(item: onepass.Item, state: {
		hovered: boolean;
		visible: boolean
	}) : Item {
		return new Item({
			key: item.uuid,
			title: item.title,
			accountName: this.itemAccount(item),
			location: item.location,
			domain: itemDomain(item),
			onSelected: () => {
				this.setSelectedItem(item);
			},
			isHovered: state.hovered,
			iconProvider: this.props.iconProvider,
			ref: item.uuid,
			visible: state.visible
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
			return this.createListItem(item, {
				hovered: index == this.state.hoveredIndex,
				visible: isVisible
			});
		});
		
		return react.DOM.div({
			className: 'itemList',
			ref: 'itemList',
			onScroll: (e) => {
				this.updateVisibleItems()
			}
		},
			listItems
		);
	}

	private updateVisibleItems() {
		var itemList = <HTMLElement>this.refs['itemList'].getDOMNode();
		if (this.state.matchingItems.length > 0) {
			var topIndex: number = -1;
			var bottomIndex: number = -1;

			var itemListRect = itemList.getBoundingClientRect();

			for (var i=0; i < this.state.matchingItems.length; i++) {
				var item = <HTMLElement>this.refs[this.state.matchingItems[i].uuid].getDOMNode();
				var itemRect = item.getBoundingClientRect();

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

function itemDomain(item: onepass.Item) : string {
	var itemURL = item.location;

	if (!itemURL) {
		return null;
	}

	var parsedUrl = url.parse(itemURL);
	return parsedUrl.host;
}

declare var firefoxAddOn: page_access.ExtensionConnector;

export class App {
	vault : Q.Promise<onepass.Vault>;
	private appView : AppView;

	constructor() {
		// UI setup
		fastclick.FastClick.attach(document.body);

		// VFS setup
		var fs: vfs.VFS;
		if (env.isFirefoxAddon()) {
			if (firefoxAddOn.syncService === 'dropbox') {
				fs = new dropboxvfs.DropboxVFS({
					authRedirectUrl: firefoxAddOn.oauthRedirectUrl,
					disableLocationCleanup: true
				});
			} else if (firefoxAddOn.syncService === 'httpfs') {
				fs = new http_vfs.Client('http://localhost:3030');
			}
		}

		if (!fs) {
			var opts = <any>url.parse(document.location.href, true /* parse query */).query;
			if (opts.httpfs) {
				fs = new http_vfs.Client(opts.httpfs);
			} else {
				fs = new dropboxvfs.DropboxVFS();
			}
		}

		var pageAccess: page_access.PageAccess;
		if (typeof firefoxAddOn != 'undefined') {
			pageAccess = new page_access.ExtensionPageAccess(firefoxAddOn);
		} else {
			pageAccess = new page_access.ExtensionPageAccess(new page_access.FakeExtensionConnector());
		}

		var iconDiskCache = new key_value_store.IndexedDBStore('passcards', 'icon-cache');
		var services = {
			iconProvider: new item_icons.ItemIconProvider(iconDiskCache, pageAccess.siteInfoProvider(), 48),
			autofiller: new autofill.AutoFiller(pageAccess)
		};

		this.appView = new AppView({services: services});
		onepass_crypto.CryptoJsCrypto.initWorkers();

		pageAccess.showEvents.listen(() => {
			// in the Firefox add-on the active element loses focus when dismissing the
			// panel by focusing another UI element such as the URL input bar.
			//
			// Restore focus to the active element when the panel is shown again
			if (document.activeElement) {
				(<HTMLElement>document.activeElement).focus();
			}
		});

		var setupView = new SetupView({});
		react.renderComponent(setupView, document.getElementById('app-view'));
		
		fs.login().then(() => {
			var keyAgent = new key_agent.SimpleKeyAgent();
			keyAgent.setAutoLockTimeout(2 * 60 * 1000);

			var vault = new onepass.Vault(fs, '/1Password/1Password.agilekeychain', keyAgent);
			react.renderComponent(this.appView, document.getElementById('app-view'));
			this.appView.setVault(vault);

			keyAgent.onLock().listen(() => {
				this.appView.setLocked(true);
			});

			this.setupBrowserInteraction(pageAccess);

		}).fail((err) => {
			this.appView.showError(err.toString());
			console.log('Failed to setup vault', err.toString());
		});
	}

	private setupBrowserInteraction(access: page_access.PageAccess) {
		access.pageChanged.listen((url) => {
			this.appView.setCurrentUrl(url);
		});
		this.appView.setCurrentUrl(access.currentUrl);
	}
}

