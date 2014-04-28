/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/dropbox.d.ts" />

import dropbox = require('dropbox');
import fs = require('fs');
import vfs = require('./vfs');

export class DropboxVFS implements vfs.VFS {
	private client : dropbox.Client;

	constructor() {
		var apiKeys : any = JSON.parse(fs.readFileSync('dropbox-key.json').toString());
		this.client = new dropbox.Client(apiKeys);
		this.client.authDriver(new dropbox.AuthDriver.NodeServer(8191));
		this.client.onError.addListener((error) => {
			console.log(error);
		});
	}

	login() : Q.Promise<string> {
		var account = Q.defer<string>();
		console.log('Logging into Dropbox...');
		this.client.authenticate((err, accountID) => {
			if (err) {
				console.log('Dropbox login failed');
				account.reject(err);
				return;
			}
			account.resolve(accountID);
		});
		return account.promise;
	}

	isLoggedIn() : boolean {
		return this.client.isAuthenticated();
	}

	/** Search for files whose name contains @p namePattern */
	search(namePattern: string, cb: (files: vfs.FileInfo[]) => any) {
		this.client.search('/', namePattern, {}, (err, files) => {
			var fileList : vfs.FileInfo[] = [];
			files.forEach((file) => {
				fileList.push(this.toVfsFile(file));
			});
			cb(fileList);
		});
	}

	/** Read the contents of a file at @p path */
	read(path: string) : Q.Promise<string> {
		var result = Q.defer<string>();
		this.client.readFile(path, {}, (error, content) => {
			if (error) {
				result.reject(error);
				return;
			}
			result.resolve(content);
		});
		return result.promise;
	}

	/** Write the contents of a file at @p path */
	write(path: string, content: string) : Q.Promise<void> {
		var result = Q.defer<void>();
		this.client.writeFile(path, content, {}, (error) => {
			if (error) {
				result.reject(error);
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	/** List the contents of a directory */
	list(path: string) : Q.Promise<vfs.FileInfo[]> {
		var result = Q.defer<vfs.FileInfo[]>();
		this.client.readdir(path, {}, (error, names, folderInfo, files) => {
			if (error) {
				result.reject(error);
				return;
			}
			var fileList : vfs.FileInfo[] = [];
			files.forEach((file) => {
				fileList.push(this.toVfsFile(file));
			});
			result.resolve(fileList);
		});
		return result.promise;
	}

	/** Remove a file */
	rm(path: string) : Q.Promise<void> {
		var result = Q.defer<void>();
		this.client.remove(path, (error) => {
			if (error) {
				result.reject(error);
				return;
			}
			result.resolve(null);
		});
		return result.promise;
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

