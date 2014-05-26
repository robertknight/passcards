/// <reference path="../../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../../typings/dropbox.d.ts" />

import dropbox = require('dropbox');
import Q = require('q');

import vfs = require('./vfs');

export class DropboxVFS implements vfs.VFS {
	private client : dropbox.Client;

	constructor() {
		var apiKeys = { "key" : "3lq6pyowxfvad8z" }
		this.client = new dropbox.Client(apiKeys);
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

	stat(path: string) : Q.Promise<vfs.FileInfo> {
		var result = Q.defer<vfs.FileInfo>();
		this.client.stat(path, {}, (err, stat) => {
			if (err) {
				result.reject(err);
				return;
			}
			result.resolve(this.toVfsFile(stat));
		});
		return result.promise;
	}

	search(namePattern: string, cb: (files: vfs.FileInfo[]) => any) {
		this.client.search('/', namePattern, {}, (err, files) => {
			var fileList : vfs.FileInfo[] = [];
			files.forEach((file) => {
				fileList.push(this.toVfsFile(file));
			});
			cb(fileList);
		});
	}

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

	mkpath(path: string) : Q.Promise<void> {
		var result = Q.defer<void>();
		this.client.mkdir(path, (err, stat) => {
			if (err) {
				result.reject(err);
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	private toVfsFile(file: any) : vfs.FileInfo {
		var fileInfo = new vfs.FileInfo;
		fileInfo.name = file.name;
		fileInfo.path = file.path;
		fileInfo.isDir = file.isFolder;
		return fileInfo;
	}
}

