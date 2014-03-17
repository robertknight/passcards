// cli.ts implements a command-line client for 1password
// using node.js

/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/q/Q.d.ts" />

declare var process;

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
	storage.login((err, account:string) => {
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
	var contents = Q.defer();
	var encKeys = Q.defer();

	var vaultItems : onepass.Item[] = [];
	var vaultKeys : onepass.EncryptionKeyEntry[] = [];

	storage.search('.agilekeychain', (files: vfs.FileInfo[]) => {
		files.forEach((file: vfs.FileInfo) => {
			storage.read(Path.join(file.path, 'data/default/contents.js'), (error, content:string) => {
				var entries = JSON.parse(content);
				contents.resolve(entries);
			});
			storage.read(Path.join(file.path, 'data/default/encryptionKeys.js'), (error, content:string) => {
				var keyList = JSON.parse(content);
				if (!keyList.list) {
					console.log('Missing `list` entry in encryptionKeys.js file');
				}
				encKeys.resolve(keyList.list);
			});
		});
	});
	contents.promise.then((entries) => {
		entries.forEach((entry : any[]) => {
			var item = new onepass.Item;
			item.uuid = entry[0];
			item.typeName = entry[1];
			item.title = entry[2];
			item.location = entry[3];
			item.updatedAt = entry[4];
			item.folderUuid = entry[5];
			item.trashed = entry[7] === "Y";
			vaultItems.push(item);
		});
	});
	encKeys.promise.then((entries) => {
		entries.forEach((entry : any) => {
			var item = new onepass.EncryptionKeyEntry;
			item.data = atob(entry.data);
			item.identifier = entry.identifier;
			item.iterations = entry.iterations;
			item.level = entry.level;
			item.validation = atob(entry.validation);
			vaultKeys.push(item);

			try {
				var masterPwd = fs.readFileSync('master-pwd');
				masterPwd = masterPwd.slice(0, masterPwd.length-1);
				var saltCipher = onepass.extractSaltAndCipherText(item.data);
				var decrypted = onepass.decryptKey(masterPwd, saltCipher[1], saltCipher[0], item.iterations, item.validation);
				console.log('successfully decrypted key ' + entry.level);
			} catch (ex) {
				console.log('failed to decrypt key ' + entry.level + ex);
			}
		});
	});
}, (err) => {
	console.log('authentication failed');
});

