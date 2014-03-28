/// <reference path="typings/DefinitelyTyped/node/node.d.ts" />

var dropbox = require('dropbox');
var fs = require('fs');
import vfs = require('./vfs');

export class DropboxVFS implements vfs.VFS {
	// TODO: Typings for dropbox-js
	private client : any;

	constructor() {
		var apiKeys = JSON.parse(fs.readFileSync('dropbox-key.json'));
		this.client = new dropbox.Client(apiKeys);
		this.client.authDriver(new dropbox.AuthDriver.NodeServer(8191));
		this.client.onError.addListener(function(error: any) {
			console.log(error);
		});
	}

	login(cb: (error:any, account: string) => any) {
		// TODO : Save credentials
		this.client.authenticate(cb);
	}

	isLoggedIn() : boolean {
		return this.client.isAuthenticated();
	}

	/** Search for files whose name contains @p namePattern */
	search(namePattern: string, cb: (files: vfs.FileInfo[]) => any) {
		this.client.search('/', namePattern, {}, (err: any, files: any[]) => {
			var fileList : vfs.FileInfo[] = [];
			files.forEach((file:any) => {
				fileList.push(this.toVfsFile(file));
			});
			cb(fileList);
		});
	}

	/** Read the contents of a file at @p path */
	read(path: string, cb: (error: any, content:string) => any) {
		this.client.readFile(path, {}, (error: any, content: string) => {
			cb(error, content);
		});
	}

	/** Write the contents of a file at @p path */
	write(path: string, content: string, cb: (error:any) => any) {
		this.client.writeFile(path, content, {}, (error:any) => {
			cb(error);
		});
	}

	/** List the contents of a directory */
	list(path: string, cb: (error: any, files: vfs.FileInfo[]) => any) {
		this.client.readdir(path, {}, (error:any, names : string[], folderInfo:any, files:any[]) => {
			if (error) {
				cb(error, []);
				return;
			}
			var fileList : vfs.FileInfo[] = [];
			files.forEach((file) => {
				fileList.push(this.toVfsFile(file));
			});
			cb(null, fileList);
		});
	}

	/** Remove a file */
	rm(path: string, cb: (error: any) => any) {
		this.client.remove(path, (error: any) => {
			cb(error);
		});
	}

	credentials() : Object {
		return this.client.credentials();
	}

	setCredentials(credentials : Object) {
		this.client.setCredentials(credentials);
	}

	private toVfsFile(file: any) : vfs.FileInfo {
		var fileInfo = new vfs.FileInfo;
		fileInfo.name = file.name;
		fileInfo.path = file.path;
		fileInfo.isDir = file.isFolder;
		return fileInfo;
	}
}

