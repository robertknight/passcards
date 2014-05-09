/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import $ = require('jquery');
import Q = require('q');

import dropboxvfs = require('../lib/dropboxvfs');
import onepass = require('../lib/onepass');

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

