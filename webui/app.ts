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

enum ActiveView {
	UnlockPane,
	ItemList,
	ItemDetailView
}

class AppViewState {
	mainView: ActiveView;
	vault: onepass.Vault;
	items: onepass.Item[];
}

class AppView extends reactts.ReactComponentBase<{}, AppViewState> {
	getInitialState() {
		var state = new AppViewState;
		state.mainView = ActiveView.UnlockPane;
		state.items = [];
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

	render() {
		return react.DOM.div({className: 'appView'},
			new UnlockPane({vault: this.state.vault}),
			new ItemListView({items: this.state.items}),
			new DetailsView({})
		);
	}
}

// View for entering master password and unlocking the vault
class UnlockPaneProps {
	vault: onepass.Vault;
}

class UnlockPane extends reactts.ReactComponentBase<UnlockPaneProps, {}> {
	componentDidMount() {
		var unlockBtn = this.refs['unlockBtn'].getDOMNode();
		$(unlockBtn).click(() => {
			var unlockField = this.refs['masterPassField'].getDOMNode();
			var masterPass = $(unlockField).val();

			this.props.vault.unlock(masterPass).then(() => {
				console.log('vault unlocked!');
			}).done();
		});
	}

	render() {
		return react.DOM.div({className: 'unlockPane'},
			react.DOM.input({
				className: 'masterPassField',
				type: 'password',
				placeholder: 'Master Password...',
				ref: 'masterPassField'
			}),
			react.DOM.input({type: 'button', value: 'Unlock', ref: 'unlockBtn'})
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
			new ItemList({items: this.props.items, filter: this.state.filter})
		);
	}
}

// Detail view for an individual item
class DetailsView extends reactts.ReactComponentBase<{}, {}> {
	render() {
		return react.DOM.div({
			children: 'This is the details view for an item'
		});
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
}

class Item extends reactts.ReactComponentBase<ItemProps, {}> {
	render() {
		return react.DOM.div({className: 'itemOverview'},
			react.DOM.img({className: 'itemIcon', src: this.props.iconURL}),
			react.DOM.div({className: 'itemDetails'},
				react.DOM.div({className: 'itemTitle'}, this.props.title),
				react.DOM.div({className: 'itemLocation'}, this.props.domain),
				react.DOM.div({className: 'itemAccount'}, this.props.accountName)
			)
		);
	}
}

// List of all items in the vault
class ItemListProps {
	items: onepass.Item[];
	filter: string;
}

class ItemList extends reactts.ReactComponentBase<ItemListProps, {}> {
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
				domain: this.itemDomain(item)
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

		account.then(() => {
			vault.resolve(new onepass.Vault(fs, '/1Password/1Password.agilekeychain'));
		}).done();

		vault.promise.then((vault) => {
			appView.setVault(vault);
		}).done();
		
		react.renderComponent(appView, document.getElementById('app-view'));
	}
}

