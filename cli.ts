// cli.ts implements a command-line client for 1password
// using node.js

/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/q/Q.d.ts" />

declare var process;

var Path = require('path');
var fs = require('fs');
var Q = require('q');
import vfs = require('./vfs');
import dropboxvfs = require('./dropboxvfs');
import onepass = require('./onepass');

var credFile : string = 'dropbox-credentials.json';
var credentials : Object = null;
if (fs.existsSync(credFile)) {
	credentials = JSON.parse(fs.readFileSync(credFile));
}

var testVfs : vfs.VFS = new dropboxvfs.DropboxVFS();
var authenticated = Q.defer();

if (credentials) {
	testVfs.setCredentials(credentials);
	authenticated.resolve(testVfs);
} else {
	console.log('Logging into Dropbox...');
	testVfs.login((err, account:string) => {
		if (err) {
			console.log('Dropbox login failed');
			authenticated.reject(err);
		} else {
			console.log('Dropbox login success');
			fs.writeFileSync('dropbox-credentials.json', JSON.stringify(testVfs.credentials()));
			authenticated.resolve(testVfs);
		}
	});
}

authenticated.promise.then(() => {
	var contents = Q.defer();
	testVfs.search('.agilekeychain', (files: vfs.FileInfo[]) => {
		files.forEach((file: vfs.FileInfo) => {
			console.log('Found keychain: ' + file.path);
			testVfs.read(Path.join(file.path, 'data/default/contents.js'), (error, content:string) => {
				console.log('Read contents.js file');
				var entries = JSON.parse(content);
				console.log('Read ' + entries.length + ' entries');
				contents.resolve(entries);
			});
		});
	});
	contents.promise.then((entries) => {
		console.log('Found ' + entries.length + ' entries');
		entries.forEach((entry : any[]) => {
			var item = new onepass.Item;
			item.uuid = entry[0];
			item.typeName = entry[1];
			item.title = entry[2];
			item.location = entry[3];
			item.updatedAt = entry[4];
			item.folderUuid = entry[5];
			item.trashed = entry[7] === "Y";

			console.log('found item ' + item.title + ' (' + item.typeName + ')');
		});
	});
}, (err) => {
	console.log('authentication failed');
});

