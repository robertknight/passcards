// cli.ts implements a command-line client for 1password
// using node.js

/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/q/Q.d.ts" />

var Path = require('path');
var fs = require('fs');
var Q = require('q');
var btoa = require('btoa');
var atob = require('atob');

import vfs = require('./vfs');
import dropboxvfs = require('./dropboxvfs');
import onepass = require('./onepass');

var credFile : string = 'dropbox-credentials.json';
var credentials : Object = null;
if (fs.existsSync(credFile)) {
	credentials = JSON.parse(fs.readFileSync(credFile));
}

var storage : vfs.VFS = new vfs.FileVFS(process.env.HOME + '/Dropbox/1Password');
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

authenticated.promise.then(() => {
	var vault : Q.Deferred<onepass.Vault> = Q.defer();
	storage.search('.agilekeychain', (files: vfs.FileInfo[]) => {
		files.forEach((file: vfs.FileInfo) => {
			vault.resolve(new onepass.Vault(storage, file.path));
		});
	});
	
	vault.promise.then((vault: onepass.Vault) => {
		console.log('vault located - unlocking');
		var masterPwd = fs.readFileSync('master-pwd').toString('binary').trim();
		vault.unlock(masterPwd).then(() => {
			console.log('vault unlocked: ' + !vault.isLocked());
		});
		vault.listItems().then((items : onepass.Item[]) => {
			console.log('vault contains ' + items.length + ' items');
			items[0].getContent().then((content: onepass.ItemContent) => {
				console.log(content);
			}), (err:any) => {
				console.log('retrieving content failed ' + err);
			}
		});
	});
}, (err: any) => {
	console.log('authentication failed');
});

