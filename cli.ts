// cli.ts implements a command-line client for 1password
// using node.js

/// <reference path="typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="typings/DefinitelyTyped/q/Q.d.ts" />

import Path = require('path');
import Q = require('q');
import dropboxvfs = require('./lib/dropboxvfs');
import fs = require('fs');
import onepass = require('./lib/onepass');
import vfs = require('./lib/vfs');

var btoa = require('btoa');
var atob = require('atob');
var argparse = require('argparse');

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
	listCommand.addArgument(['-p', '--pattern'], {
		action:'store',
		dest: 'pattern',
		nargs: 1,
		type: 'string'
	})

	var showJSONCommand = subcommands.addParser('show-json');
	showJSONCommand.addArgument(['pattern'], {action:'store'});

	var showOverviewCommand = subcommands.addParser('show-overview');
	showOverviewCommand.addArgument(['pattern'], {action:'store'});

	return parser;
}();
var args = parser.parseArgs();

// connect to sync service and open vault
var credFile : string = 'dropbox-credentials.json';
var credentials : Object = null;
if (fs.existsSync(credFile)) {
	credentials = JSON.parse(fs.readFileSync(credFile).toString());
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
var vault = Q.defer<onepass.Vault>();
var currentVault : onepass.Vault;
authenticated.promise.then(() => {
	storage.search('.agilekeychain', (files: vfs.FileInfo[]) => {
		files.forEach((file: vfs.FileInfo) => {
			vault.resolve(new onepass.Vault(storage, file.path));
		});
	});
}, (err: any) => {
	console.log('authentication failed');
})
.done();

// unlock vault
var unlocked = Q.defer<boolean>();
vault.promise.then((vault: onepass.Vault) => {
	console.log('Unlocking vault...');
	var masterPwd = fs.readFileSync('master-pwd').toString('binary').trim();
	vault.unlock(masterPwd).then(() => {
		unlocked.resolve(true);
	});
	currentVault = vault;
})
.done();

function patternMatch(pattern: string, item: onepass.Item) {
	pattern = pattern.toLowerCase();
	var titleLower = item.title.toLowerCase();
	return titleLower.indexOf(pattern) != -1;
}

function lookupItems(vault: onepass.Vault, pattern: string) : Q.Promise<onepass.Item[]> {
	var result = Q.defer<onepass.Item[]>();
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

interface HandlerMap {
	[index: string] : (args: any, result : Q.Deferred<number>) => void;
}

var handlers : HandlerMap = {};

handlers['list'] = (args, result) => {
	currentVault.listItems().then((items : onepass.Item[]) => {
		items.sort((a:onepass.Item, b:onepass.Item) => {
			return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
		});
		items.forEach((item) => {
			if (!args.pattern || patternMatch(args.pattern[0], item)) {
				console.log(item.title);
			}
		});
		result.resolve(0);
	}).done();
};

handlers['show-json'] = (args, result) => {
	lookupItems(currentVault, args.pattern).then((items) => {
		var itemContents : Q.Promise<onepass.ItemContent>[] = [];
		items.forEach((item) => {
			itemContents.push(item.getContent());
		});
		Q.all(itemContents).then((contents) => {
			contents.forEach((content) => {
				console.log(content);
			});
			exitStatus.resolve(0);
		});
	}).done();
};

handlers['show-overview'] = (args, result) => {
	lookupItems(currentVault, args.pattern).then((items) => {
		items.forEach((item) => {
			console.log(item);
		});
		result.resolve(0);
	}).done();
};

// process commands
var exitStatus = Q.defer<number>();
unlocked.promise.then(() => {
	if (handlers[args.command]) {
		handlers[args.command](args, exitStatus);
	} else {
		console.log('Unknown command: ' + args.command);
		exitStatus.resolve(1);
	}
})
.done();

exitStatus.promise.then((status) => {
	process.exit(status);
})
.done();
