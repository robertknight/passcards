/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />

import $ = require('jquery');
import Q = require('q');
import react = require('react');
import reactts = require('react-typescript');

import dropboxvfs = require('../lib/dropboxvfs');
import onepass = require('../lib/onepass');

class AppView extends reactts.ReactComponentBase<{}, {}> {
	render() {
		return new ItemList({
			className: 'commentBox',
			children: 'Hello - I am a react element'
		});
	}
}

// View for entering master password and unlocking the vault
class UnlockPane extends reactts.ReactComponentBase<{}, {}> {
	render() {
		return react.DOM.div({
			children: 'This is the vault unlock pane'
		});
	}
}

// Search box to search through items in the view
class SearchField extends reactts.ReactComponentBase<{}, {}> {
	render() {
		return react.DOM.div({
			children: 'This is a search field for the item view'
		});
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
class Item extends reactts.ReactComponentBase<{}, {}> {
	render() {
		return react.DOM.div({
			children: 'This is an item'
		});
	}
}

// List of all items in the vault
class ItemList extends reactts.ReactComponentBase<{}, {}> {
	render() {
		return react.DOM.div({
			children: 'This is the item list'
		});
	}
}

export class App {
	vault : Q.Promise<onepass.Vault>;

	constructor() {
		var fs = new dropboxvfs.DropboxVFS();
		var account = fs.login();
		var vault = Q.defer<onepass.Vault>();
		this.vault = vault.promise;

		account.then(() => {
			vault.resolve(new onepass.Vault(fs, '/1Password/1Password.agilekeychain'));
			var content = '';
			
		}).done();
		
		this.vault.then((vault) => {
			vault.listItems().then((items) => {
				items.sort((a, b) => {
					return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
				});
				var content = '';
				var linkIDs : string[] = [];
				items.forEach((item) => {
					var linkID = 'item-' + item.uuid;
					content = content + '<div><a href="#" id="' + linkID + '">'  + item.title + '</a></div>';
					linkIDs.push(linkID);
				});
				$('#item-list').html(content);
				items.forEach((item, index) => {
					$('#' + linkIDs[index]).click(() => {
						this.showDetails(item);
					});
				});
			});
		}).done();

		$('#unlock-btn').click(() => {
			var pass = $('#master-pass').val();
			var lockStatus = $('#lock-status');
			lockStatus.text('Unlocking...');
			this.vault.then((vault) => {
				return vault.unlock(pass);
			})
			.then((unlocked) => {
				lockStatus.text('Vault Unlocked');
			})
			.fail((err) => {
				lockStatus.text('Unlocking failed: ' + err);
			});
		});

		react.renderComponent(new AppView({}), document.getElementById('react-content'));
	}

	showDetails(item: onepass.Item) {
		console.log('Fetching content for ' + item.title);
		item.getContent().then((content) => {
			$('#item-details').html(JSON.stringify(content));
		})
		.fail((err) => {
			$('#item-details').html('Failed to retrieve item details');
		})
		.done();
	}
}

