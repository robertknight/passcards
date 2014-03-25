// cli.ts implements a command-line client for 1password
// using node.js

/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/q/Q.d.ts" />

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

// process commands
unlocked.promise.then(() => {
	currentVault.listItems().then((items : onepass.Item[]) => {
		items[0].getContent().then((content: onepass.ItemContent) => {
			console.log(content);
			process.exit(0);
		}), (err:any) => {
			console.log('retrieving content failed ' + err);
		}
	});
});


