// cli.ts implements a command-line client for 1password
// using node.js

/// <reference path="typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="typings/DefinitelyTyped/q/Q.d.ts" />

var Path = require('path');
var fs = require('fs');
var Q = require('q');
var btoa = require('btoa');
var atob = require('atob');
var argparse = require('argparse');

import vfs = require('./vfs');
import dropboxvfs = require('./dropboxvfs');
import onepass = require('./onepass');

var parser = function() {
	var parser = new argparse.ArgumentParser({
		description: '1Password command-line client'
	});
	parser.addArgument(['-s', '--storage'], {
		action: 'store',
		nargs: 1,
		defaultValue: 'file',
		dest: 'storage'
	});
	var subcommands = parser.addSubparsers({dest:'command'});

	var listCommand = subcommands.addParser('list');
	listCommand.addArgument(['pattern'], {action:'store'})

	var showJSONCommand = subcommands.addParser('show-json');
	showJSONCommand.addArgument(['pattern'], {action:'store'});

	return parser;
}();
var args = parser.parseArgs();

// connect to sync service and open vault
var credFile : string = 'dropbox-credentials.json';
var credentials : Object = null;
if (fs.existsSync(credFile)) {
	credentials = JSON.parse(fs.readFileSync(credFile));
}

var storage : vfs.VFS;
if (args.storage == 'file') {
	storage = new vfs.FileVFS(process.env.HOME + '/Dropbox/1Password');
} else if (args.storage == 'dropbox') {
	storage = new dropboxvfs.DropboxVFS();
}
var authenticated = Q.defer();

if (credentials) {
	storage.setCredentials(credentials);
	authenticated.resolve(storage);
} else {
	console.log('Logging into Dropbox...');
	storage.login((err: any, account:string) => {
		if (err) {
			console.log('Dropbox login failed');
			authenticated.reject(err);
		} else {
			console.log('Dropbox login success');
			fs.writeFileSync('dropbox-credentials.json', JSON.stringify(storage.credentials()));
			authenticated.resolve(storage);
		}
	});
}

// open vault
var vault : Q.Deferred<onepass.Vault> = Q.defer();
var currentVault : onepass.Vault;
authenticated.promise.then(() => {
	storage.search('.agilekeychain', (files: vfs.FileInfo[]) => {
		files.forEach((file: vfs.FileInfo) => {
			vault.resolve(new onepass.Vault(storage, file.path));
		});
	});
}, (err: any) => {
	console.log('authentication failed');
});

// unlock vault
var unlocked : Q.Deferred<boolean> = Q.defer();
vault.promise.then((vault: onepass.Vault) => {
	console.log('Unlocking vault...');
	var masterPwd = fs.readFileSync('master-pwd').toString('binary').trim();
	vault.unlock(masterPwd).then(() => {
		unlocked.resolve(true);
	});
	currentVault = vault;
});

function patternMatch(pattern: string, item: onepass.Item) {
	pattern = pattern.toLowerCase();
	var titleLower = item.title.toLowerCase();
	return titleLower.indexOf(pattern) != -1;
}

function lookupItems(vault: onepass.Vault, pattern: string) : Q.IPromise<onepass.Item[]> {
	var result : Q.Deferred<onepass.Item[]> = Q.defer();
	vault.listItems().then((items:onepass.Item[]) => {
		var matches : onepass.Item[] = [];
		items.forEach((item) => {
			if (patternMatch(pattern, item)) {
				matches.push(item);
			}
		});
		result.resolve(matches);
	}, (err:any) => {
		console.log('Looking up items failed');
	});
	return result.promise;
}

// process commands
unlocked.promise.then(() => {
	switch (args.command) {
		case 'list':
			currentVault.listItems().then((items : onepass.Item[]) => {
				items.sort((a:onepass.Item, b:onepass.Item) => {
					return a.title.localeCompare(b.title);
				});
				items.forEach((item) => {
					if (!args.pattern || patternMatch(args.pattern, item)) {
						console.log(item.title);
					}
				});
			});
			break;
		case 'show-json':
			lookupItems(currentVault, args.pattern).then((items) => {
				items.forEach((item) => {
					item.getContent().then((content) => {
						console.log(content);
					});
				});
			});
			break;
		default:
			console.log('Unknown command: ' + args.command);
			break;
	}
});

