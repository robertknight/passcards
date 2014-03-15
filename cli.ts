// cli.ts implements a command-line client for 1password
// using node.js

declare var require;
declare var process;

var Path = require('path');
import vfs = require('./vfs');
import dropboxvfs = require('./dropboxvfs');

var testVfs : vfs.VFS = new dropboxvfs.DropboxVFS(); //new vfs.FileVFS(Path.join(process.env.HOME, 'Dropbox'));
testVfs.login((err, account:string) => {
	if (err) {
		console.log('dropbox login failed');
		return;
	}

	testVfs.search('.agilekeychain', (files: vfs.FileInfo[]) => {
		files.forEach((file: vfs.FileInfo) => {
			console.log('Found keychain: ' + file.path);
			testVfs.read(Path.join(file.path, 'data/default/contents.js'), (error, content:string) => {
				var entries = JSON.parse(content);
				console.log('entry count ' + entries.length);
			});
		});
	});
});

