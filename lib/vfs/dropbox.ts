
import dropbox = require('dropbox');
import Q = require('q');

import assign = require('../base/assign');
import err_util = require('../base/err_util');
import vfs = require('./vfs');

export interface Options {
}

function convertError(error: dropbox.ApiError): vfs.VfsError {
	const apiError = new err_util.ApiError(error.url, error.status, error.responseText);
	let type = vfs.ErrorType.Other;
	if (error.status === 404) {
		type = vfs.ErrorType.FileNotFound;
	} else if (error.status === 401) {
		type = vfs.ErrorType.AuthError;
	}
	const vfsError = new vfs.VfsError(type, error.responseText);
	vfsError.sourceErr = apiError;
	return vfsError;
}

export const CLIENT_ID = '3lq6pyowxfvad8z';

export class DropboxVFS implements vfs.VFS {
	private client: dropbox.Client;

	constructor(options?: Options) {
		var clientOpts = {
			key: CLIENT_ID
		};
		this.client = new dropbox.Client(clientOpts);
		this.client.onError.addListener((error) => {
			console.log('Dropbox API Error:', convertError(error).message);
		});
	}

	authURL() {
		return `https://www.dropbox.com/1/oauth2/authorize?client_id=${CLIENT_ID}&response_type=token`;
	}

	accountInfo() {
		var result = Q.defer<vfs.AccountInfo>();
		this.client.getAccountInfo({}, (err, info) => {
			if (err) {
				result.reject(convertError(err));
				return;
			}
			var accountInfo = {
				userId: info.uid,
				name: info.name,
				email: info.email
			};
			result.resolve(accountInfo);
		});
		return result.promise;
	}

	stat(path: string): Q.Promise<vfs.FileInfo> {
		var result = Q.defer<vfs.FileInfo>();
		this.client.stat(path, {}, (err, stat) => {
			if (err) {
				result.reject(convertError(err));
				return;
			}
			result.resolve(this.toVfsFile(stat));
		});
		return result.promise;
	}

	search(namePattern: string, cb: (error: Error, files: vfs.FileInfo[]) => any) {
		this.client.search('/', namePattern, {}, (err, files) => {
			if (err) {
				cb(convertError(err), null);
				return;
			}
			var fileList: vfs.FileInfo[] = [];
			files.forEach((file) => {
				fileList.push(this.toVfsFile(file));
			});
			cb(null, fileList);
		});
	}

	read(path: string): Q.Promise<string> {
		var result = Q.defer<string>();
		this.client.readFile(path, {}, (error, content) => {
			if (error) {
				result.reject(convertError(error));
				return;
			}
			result.resolve(content);
		});
		return result.promise;
	}

	write(path: string, content: string, options: vfs.WriteOptions = {}): Q.Promise<vfs.FileInfo> {
		var result = Q.defer<vfs.FileInfo>();
		var dropboxWriteOpts: dropbox.WriteFileOptions = {};

		if (options && options.parentRevision) {
			dropboxWriteOpts.parentRev = options.parentRevision;
			// TODO - Add support to dropbox-js for the autorename option
			// dropboxWriteOpts.autorename = false;
		}

		this.client.writeFile(path, content, dropboxWriteOpts, (error, stat) => {
			if (error) {
				result.reject(convertError(error));
				return;
			}
			result.resolve(this.toVfsFile(stat));
		});
		return result.promise;
	}

	list(path: string): Q.Promise<vfs.FileInfo[]> {
		var result = Q.defer<vfs.FileInfo[]>();
		this.client.readdir(path, {}, (error, names, folderInfo, files) => {
			if (error) {
				result.reject(convertError(error));
				return;
			}
			var fileList: vfs.FileInfo[] = [];
			files.forEach((file) => {
				fileList.push(this.toVfsFile(file));
			});
			result.resolve(fileList);
		});
		return result.promise;
	}

	rm(path: string): Q.Promise<void> {
		var result = Q.defer<void>();
		this.client.remove(path, (error) => {
			if (error) {
				result.reject(convertError(error));
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	credentials(): vfs.Credentials {
		return <vfs.Credentials>this.client.credentials();
	}

	setCredentials(credentials: vfs.Credentials) {
		let dropboxCredentials = assign({}, {
			token: credentials.accessToken
		}, credentials);
		this.client.setCredentials(dropboxCredentials);
	}

	mkpath(path: string): Q.Promise<void> {
		var result = Q.defer<void>();
		this.client.mkdir(path, (err, stat) => {
			if (err) {
				result.reject(convertError(err));
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	private toVfsFile(file: dropbox.File.Stat): vfs.FileInfo {
		return {
			name: file.name,
			path: file.path,
			isDir: file.isFolder,
			revision: file.versionTag,
			lastModified: file.modifiedAt,
			size: file.size
		};
	}
}
