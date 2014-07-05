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
import http_client = require('../lib/http_client');
import http_vfs = require('../lib/vfs/http');
import item_search = require('../lib/item_search');
import onepass = require('../lib/onepass');
import page_access = require('./page_access');
import stringutil = require('../lib/base/stringutil');
import vfs = require('../lib/vfs/vfs');

import onepass_crypto = require('../lib/onepass_crypto');

enum ActiveView {
	UnlockPane,
	ItemList,
	ItemDetailView
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
}

/** The main top-level app view. */
class AppView extends reactts.ReactComponentBase<{}, AppViewState> {
	private autofillHandler: autofill.AutoFillHandler;

	constructor(autofillHandler: autofill.AutoFillHandler) {
		super({});

		this.autofillHandler = autofillHandler;
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

		vault.listItems().then((items) => {
			var state = this.state;
			state.items = items;
			this.setState(state);
		});

		this.setState(state);
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
					}
				})
			);
		} else {
			children.push(new ItemListView({
				items: this.state.items,
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
			});
		});
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
}

class SearchField extends reactts.ReactComponentBase<SearchFieldProps, {}> {
	componentDidMount() {
		var updateQuery = underscore.debounce(() => {
			this.props.onQueryChanged($(searchField).val().toLowerCase());
		}, 100);

		var searchField = this.refs['searchField'].getDOMNode();
		$(searchField).bind('input', <(eventObject: JQueryEventObject) => any>updateQuery);
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
	onSelectedItemChanged: (item: onepass.Item) => void;
	currentURL: string;
}

class ItemListView extends reactts.ReactComponentBase<ItemListViewProps, ItemListViewState> {
	getInitialState() {
		var state = new ItemListViewState();
		return state;
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
			new SearchField({onQueryChanged: this.updateFilter}),
			new ItemList({items: this.props.items, filter: this.state.filter,
			              filterURL: filterURL,
			              onSelectedItemChanged: this.props.onSelectedItemChanged})
		);
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

	componentWillReceiveProps(nextProps: DetailsViewProps) {
		if (!nextProps.item) {
			return;
		}

		nextProps.item.getContent().then((content) => {
			// TODO - Cache content and avoid using forceUpdate()
			this.itemContent = content;
			this.forceUpdate();
		}).done();
	}

	componentDidMount() {
		$(this.refs['backLink'].getDOMNode()).click(() => {
			this.props.onGoBack();
		});
		$(this.refs['autofillBtn'].getDOMNode()).click(() => {
			this.props.autofill();
		});
	}

	render() {
		var detailsContent : react.ReactComponent<any,any>;
		if (this.props.item && this.itemContent) {
			var account = this.itemContent.account();
			var password = this.itemContent.password();
			var sections : react.ReactComponent<any,any>[] = [];

			detailsContent = react.DOM.div({className: 'detailsContent'},
				react.DOM.div({className: 'detailsHeader'},
					react.DOM.img({className: 'detailsHeaderIcon itemIcon', src:this.props.iconURL}),
					react.DOM.div({},
						react.DOM.div({className: 'detailsTitle'}, this.props.item.title),
						react.DOM.div({className: 'detailsLocation'}, this.props.item.location))
				),
				react.DOM.div({className: 'detailsCore'},
					react.DOM.div({className: 'detailsField detailsAccount'},
						react.DOM.div({className: 'detailsFieldLabel'}, 'Account'),
						react.DOM.div({}, account)),
					react.DOM.div({className: 'detailsField detailsPass'},
						react.DOM.div({className: 'detailsFieldLabel'}, 'Password'),
						react.DOM.div({}, password))),
				react.DOM.div({className: 'detailsSections'},
					sections)
			);
		}

		return react.DOM.div({
			className: stringutil.truthyKeys({
				detailsView: true,
				hasSelectedItem: this.props.item
			})
		},
			react.DOM.div({className: stringutil.truthyKeys({toolbar: true, detailsToolbar: true})},
				react.DOM.a({className: 'toolbarLink', href:'#', ref:'backLink'}, 'Back')),
				react.DOM.div({className: 'itemActionBar'},
						react.DOM.input({className: 'itemActionButton', type: 'button', value: 'Autofill', ref: 'autofillBtn'})
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
}

class Item extends reactts.ReactComponentBase<ItemProps, {}> {
	componentDidMount() {
		$(this.refs['itemOverview'].getDOMNode()).click(() => {
			this.props.onSelected();
		});
	}

	render() {
		return react.DOM.div({className: 'itemOverview', ref: 'itemOverview'},
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
	selectedItem: onepass.Item;
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

	createListItem(item: onepass.Item) : Item {
		return new Item({
			key: item.uuid,
			title: item.title,
			iconURL: itemIconURL(item),
			accountName: this.itemAccount(item),
			location: item.location,
			domain: itemDomain(item),
			onSelected: () => {
				this.setSelectedItem(item);
			}
		});
	}

	render() {
		var matchingItems : onepass.Item[] = [];
		var matchesAreSorted = false;

		if (this.props.filter) {
			matchingItems = underscore.filter(this.props.items, (item) => {
				return item_search.matchItem(item, this.props.filter);
			});
		} else if (this.props.filterURL) {
			matchingItems = item_search.filterItemsByUrl(this.props.items, this.props.filterURL);
			if (matchingItems.length > 0) {
				matchesAreSorted = true;
			} else {
				// if no items appear to match this URL, show the
				// complete list and let the user browse or filter
				matchingItems = this.props.items;
			}
		} else {
			matchingItems = this.props.items;
		}

		if (!matchesAreSorted) {
			matchingItems.sort((a, b) => {
				return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
			});
		}

		var listItems = matchingItems.map((item) => {
			return this.createListItem(item);
		});
		
		return react.DOM.div({className: 'itemList'},
			listItems
		);
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

declare var firefoxAddOn: page_access.PageAccess;

export class App {
	vault : Q.Promise<onepass.Vault>;
	private appView : AppView;

	constructor() {
		// UI setup
		fastclick.FastClick.attach(document.body);

		// VFS setup
		var fs: vfs.VFS;
		if (env.isFirefoxAddon()) {
			fs = new dropboxvfs.DropboxVFS({
				authRedirectUrl: firefoxAddOn.oauthRedirectUrl(),
				disableLocationCleanup: true
			});
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
		if (firefoxAddOn) {
			pageAccess = firefoxAddOn;
		}

		this.appView = new AppView(new autofill.AutoFiller(pageAccess));
		onepass_crypto.CryptoJsCrypto.initWorkers();

		var setupView = new SetupView({});
		react.renderComponent(setupView, document.getElementById('app-view'));
		
		fs.login().then(() => {
			var vault = new onepass.Vault(fs, '/1Password/1Password.agilekeychain');
			react.renderComponent(this.appView, document.getElementById('app-view'));
			this.appView.setVault(vault);
			if (pageAccess) {
				this.setupBrowserInteraction(pageAccess);
			}
		}).fail((err) => {
			console.log('Failed to setup vault', err);
		});
	}

	private setupBrowserInteraction(access: page_access.PageAccess) {
		access.addPageChangedListener((url) => {
			this.appView.setCurrentURL(url);
		});
	}
}

