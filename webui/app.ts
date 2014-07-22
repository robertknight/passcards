/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />
/// <reference path="../typings/fastclick.d.ts" />

import $ = require('jquery');
import fastclick = require('fastclick');
import Q = require('q');
import react = require('react');
import reactts = require('react-typescript');
import underscore = require('underscore');
import url = require('url');

import autofill = require('./autofill');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import key_agent = require('../lib/key_agent');
import http_client = require('../lib/http_client');
import http_vfs = require('../lib/vfs/http');
import item_search = require('../lib/item_search');
import onepass = require('../lib/onepass');
import page_access = require('./page_access');
import shortcut = require('./base/shortcut');
import stringutil = require('../lib/base/stringutil');
import vfs = require('../lib/vfs/vfs');

import onepass_crypto = require('../lib/onepass_crypto');

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
	currentURL: string;
	status: Status;
}

/** The main top-level app view. */
class AppView extends reactts.ReactComponentBase<{}, AppViewState> {
	private autofillHandler: autofill.AutoFillHandler;

	constructor(autofillHandler: autofill.AutoFillHandler) {
		super({});

		this.autofillHandler = autofillHandler;

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

	setCurrentURL(url: string) {
		var state = this.state;
		state.currentURL = url;

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
		this.autofillHandler.autofill(item);
	}

	render() {
		var children: react.ReactComponent<any,any>[] = [];
		if (this.state.isLocked) {
			children.push(
				new UnlockPane({
					vault: this.state.vault,
					isLocked: this.state.isLocked,
					onUnlock: () => {
						this.setLocked(false);
					},
					onUnlockErr: (err) => {
						this.showError(err);
					}
				})
			);
		} else {
			children.push(new ItemListView({
				items: this.state.items,
				selectedItem: this.state.selectedItem,
				onSelectedItemChanged: (item) => { this.setSelectedItem(item); },
				currentURL: this.state.currentURL
			}));
			children.push(new DetailsView({
				item: this.state.selectedItem,
				iconURL: this.state.selectedItem ? itemIconURL(this.state.selectedItem) : '',
				onGoBack: () => {
					this.setSelectedItem(null);
				},
				autofill: () => {
					this.autofill(this.state.selectedItem);
				}
			}));
		}
		if (this.state.status) {
			children.push(new StatusView({
				status: this.state.status
			}));
		}

		return react.DOM.div({className: 'appView'},
			children
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
	currentURL: string;
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
		var filterURL : string;
		if (!this.state.filter && this.props.currentURL) {
			filterURL = this.props.currentURL;
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
				filterURL: filterURL,
				onSelectedItemChanged: (item) => {
					if (!item) {
						this.focusSearchField();
					}
					this.props.onSelectedItemChanged(item);
				},
				ref: 'itemList'
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
	iconURL: string;

	onGoBack: () => any;
	autofill: () => void;
}

class ItemSectionProps {
	title: string;
	type: onepass.FormFieldType
	value: string;
}

class DetailsView extends reactts.ReactComponentBase<DetailsViewProps, {}> {
	itemContent : onepass.ItemContent;
	shortcuts: shortcut.Shortcut[];

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
	}

	componentDidUnmount() {
		this.shortcuts.forEach((shortcut) => {
			shortcut.remove();
		});
		this.shortcuts = [];
	}

	private updateShortcutState() {
		// enable keyboard shortcuts when the details view
		// is displaying an item
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

			detailsContent = react.DOM.div({className: 'detailsContent'},
				react.DOM.div({className: 'detailsHeader'},
					react.DOM.img({className: 'detailsHeaderIcon itemIcon', src:this.props.iconURL}),
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
class ItemProps {
	key: string;
	title: string;
	iconURL: string;
	accountName: string;
	location: string;
	domain: string;
	onSelected: () => void;
	isHovered: boolean;
}

class Item extends reactts.ReactComponentBase<ItemProps, {}> {
	componentDidMount() {
		$(this.refs['itemOverview'].getDOMNode()).click(() => {
			this.props.onSelected();
		});
	}

	render() {
		return react.DOM.div({className: stringutil.truthyKeys({itemOverview: true,
				itemHovered: this.props.isHovered}), ref: 'itemOverview'},
			react.DOM.img({className: 'itemIcon', src: this.props.iconURL}),
			react.DOM.div({className: 'itemDetails'},
				react.DOM.div({className: 'itemTitle'}, this.props.title),
				react.DOM.div({className: 'itemLocation'}, this.props.domain),
				react.DOM.div({className: 'itemAccount'}, this.props.accountName)
			)
		);
	}
}

class ItemListState {
	// TODO - Remove selected item here
	selectedItem: onepass.Item;

	hoveredIndex: number;
	matchingItems: onepass.Item[];

	constructor() {
		this.hoveredIndex = 0;
		this.matchingItems = [];
	}
}

class ItemListProps {
	items: onepass.Item[];
	filter: string;
	filterURL: string;
	onSelectedItemChanged: (item: onepass.Item) => void;
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
		return new ItemListState();
	}

	createListItem(item: onepass.Item, hovered: boolean) : Item {
		return new Item({
			key: item.uuid,
			title: item.title,
			iconURL: itemIconURL(item),
			accountName: this.itemAccount(item),
			location: item.location,
			domain: itemDomain(item),
			onSelected: () => {
				this.setSelectedItem(item);
			},
			isHovered: hovered
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
	}

	componentWillReceiveProps(nextProps: ItemListProps) {
		this.updateMatchingItems(nextProps);
	}

	render() {
		var listItems = this.state.matchingItems.map((item, index) => {
			return this.createListItem(item, index == this.state.hoveredIndex);
		});
		
		return react.DOM.div({className: 'itemList'},
			listItems
		);
	}

	private updateMatchingItems(props: ItemListProps) {
		var prevHoveredItem = this.hoveredItem();
		var matchingItems: onepass.Item[] = [];
		var matchesAreSorted = false;

		if (props.filter) {
			matchingItems = underscore.filter(props.items, (item) => {
				return item_search.matchItem(item, props.filter);
			});
		} else if (props.filterURL) {
			matchingItems = item_search.filterItemsByUrl(props.items, props.filterURL);
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

function itemIconURL(item: onepass.Item) : string {
	// TODO - Setup a service to get much prettier icons for URLs
	var domain = itemDomain(item);
	if (domain) {
		return 'http://' + itemDomain(item) + '/favicon.ico';
	} else {
		return null;
	}
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
				fs = new http_vfs.Client(new http_client.Client('localhost', 3030, 'http'));
			}
		}

		if (!fs) {
			var opts = <any>url.parse(document.location.href, true /* parse query */).query;
			if (opts.httpfs) {
				var hostPort = opts.httpfs.split(':');
				fs = new http_vfs.Client(new http_client.Client(hostPort[0], parseInt(hostPort[1])));
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

		this.appView = new AppView(new autofill.AutoFiller(pageAccess));
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
			console.log('current URL set to', url);
			this.appView.setCurrentURL(url);
		});
	}
}

