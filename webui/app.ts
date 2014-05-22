/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />

import $ = require('jquery');
import Q = require('q');
import react = require('react');
import reactts = require('react-typescript');
import underscore = require('underscore');
import url = require('url');

import dropboxvfs = require('../lib/dropboxvfs');
import onepass = require('../lib/onepass');

import onepass_crypto = require('../lib/onepass_crypto');

enum ActiveView {
	UnlockPane,
	ItemList,
	ItemDetailView
}

class AppViewState {
	mainView: ActiveView;
	vault: onepass.Vault;
	items: onepass.Item[];
	selectedItem: onepass.Item;
	isLocked: boolean;
}

class AppView extends reactts.ReactComponentBase<{}, AppViewState> {
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

	setLocked(locked: boolean) {
		var state = this.state;
		state.isLocked = locked;
		this.setState(state);
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
				onSelectedItemChanged: (item) => { this.setSelectedItem(item); }
			}));
			children.push(new DetailsView({item: this.state.selectedItem}));
		}

		return react.DOM.div({className: 'appView'},
			children
		);
	}
}

// View for entering master password and unlocking the vault
class UnlockPaneProps {
	vault: onepass.Vault;
	isLocked: boolean;
	onUnlock: () => void;
}

class UnlockPane extends reactts.ReactComponentBase<UnlockPaneProps, {}> {
	componentDidMount() {
		var unlockForm = this.refs['unlockPaneForm'].getDOMNode();
		$(unlockForm).submit((e) => {
			e.preventDefault();

			var unlockField = this.refs['masterPassField'].getDOMNode();
			var masterPass = $(unlockField).val();

			this.props.vault.unlock(masterPass).then(() => {
				this.props.onUnlock();
				console.log('vault unlocked!');
			}).done();
		});
	}

	render() {
		if (!this.props.isLocked) {
			return react.DOM.div({});
		}

		return react.DOM.div({className: 'unlockPane'},
			react.DOM.form({className: 'unlockPaneInputs', ref:'unlockPaneForm'},
				react.DOM.input({
					className: 'masterPassField',
					type: 'password',
					placeholder: 'Master Password...',
					ref: 'masterPassField'
				}),
				react.DOM.input({type: 'submit', value: 'Unlock', ref: 'unlockBtn'})
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
		return react.DOM.div({className: 'searchField'},
				react.DOM.input({className: 'searchFieldInput',
					type: 'search',
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
}

class ItemListView extends reactts.ReactComponentBase<ItemListViewProps, ItemListViewState> {
	getInitialState() {
		return new ItemListViewState();
	}

	updateFilter = (filter: string) => {
		var state = this.state;
		state.filter = filter;
		this.setState(state);
	}

	render() {
		return react.DOM.div({className: 'itemListView'},
			new SearchField({onQueryChanged: this.updateFilter}),
			new ItemList({items: this.props.items, filter: this.state.filter,
			              onSelectedItemChanged: this.props.onSelectedItemChanged})
		);
	}
}

// Detail view for an individual item
class DetailsViewProps {
	item: onepass.Item;
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

	render() {
		var children: react.ReactComponent<any,any>[] = [];
		if (this.props.item) {
			children.push(react.DOM.div({className: 'detailsTitle'}, this.props.item.title));
			children.push(react.DOM.div({}, this.props.item.location));
			var itemFields : reactts.ReactComponentBase<any,any>[] = [];
			children = children.concat(itemFields);
		}

		return react.DOM.div({className: 'detailsView'}, children);
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
	onSelectedItemChanged: (item: onepass.Item) => void;
}

class ItemList extends reactts.ReactComponentBase<ItemListProps, ItemListState> {
	itemDomain(item: onepass.Item) : string {
		var itemURL = item.location;

		if (!itemURL) {
			return null;
		}

		var parsedUrl = url.parse(itemURL);
		return parsedUrl.host;
	}

	itemIconURL(item: onepass.Item) : string {
		// TODO - Setup a service to get much prettier icons for URLs
		var domain = this.itemDomain(item);
		if (domain) {
			return 'http://' + this.itemDomain(item) + '/favicon.ico';
		} else {
			return null;
		}
	}

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

	render() {
		var listItems : Item[] = [];
		this.props.items.forEach((item) => {
			if (this.props.filter && item.title.toLowerCase().indexOf(this.props.filter) == -1) {
				return;
			}

			listItems.push(new Item({
				key: item.uuid,
				title: item.title,
				iconURL: this.itemIconURL(item),
				accountName: this.itemAccount(item),
				location: item.location,
				domain: this.itemDomain(item),
				onSelected: () => {
					this.setSelectedItem(item);
				}
			}));
		});

		listItems.sort((a, b) => {
			return a.props.title.toLowerCase().localeCompare(b.props.title.toLowerCase());
		});
		
		return react.DOM.div({className: 'itemList'},
			listItems
		);
	}
}

export class App {
	vault : Q.Promise<onepass.Vault>;

	constructor() {
		var fs = new dropboxvfs.DropboxVFS();
		var account = fs.login();
		var vault = Q.defer<onepass.Vault>();
		this.vault = vault.promise;
		
		var appView = new AppView({});
		onepass_crypto.CryptoJsCrypto.initWorkers();

		account.then(() => {
			vault.resolve(new onepass.Vault(fs, '/1Password/1Password.agilekeychain'));
		}).done();

		vault.promise.then((vault) => {
			appView.setVault(vault);
		}).done();
		
		react.renderComponent(appView, document.getElementById('app-view'));
	}
}

