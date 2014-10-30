/// <reference path="../../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../../typings/dropbox.d.ts" />

import dropbox = require('dropbox');
import Q = require('q');

import vfs = require('./vfs');

export enum AuthMode {
	Redirect,
	ChromeExtension
}

export interface Options {
	authMode: AuthMode;

	/** The URL which the browser should be redirected back to
	  * after completing OAuth login.
	  *
	  * This defaults to the current page's URL.
	  *
	  * In some environments (eg. Firefox addons) this may need
	  * to be modified to account for security restrictions.
	  */
	authRedirectUrl: string;
	disableLocationCleanup: boolean;
	
	/** Specifies the URL to the post-authentication receiver
	  * page when using the Chrome auth driver.
	  */
	receiverPage: string;
}

export class DropboxVFS implements vfs.VFS {
	private client : dropbox.Client;

	constructor(options?: Options) {
		var clientOpts = {
			key : "3lq6pyowxfvad8z"
		};
		this.client = new dropbox.Client(clientOpts);

		if (!options || options.authMode == AuthMode.Redirect) {
			var redirectOpts: dropbox.AuthDriver.RedirectDriverOpts = {};
			if (options) {
				redirectOpts.redirectUrl = options.authRedirectUrl;
			}
			this.client.authDriver(new dropbox.AuthDriver.Redirect(redirectOpts));
		} else if (options.authMode == AuthMode.ChromeExtension) {
			this.client.authDriver(new dropbox.AuthDriver.ChromeExtension({
				receiverPath: options.receiverPage
			}));
		}

		this.client.onError.addListener((error) => {
			console.log(error);
		});

		if (options && options.disableLocationCleanup) {
			// the Dropbox redirect OAuth driver tries to use
			// window.history.replaceState() to remove the access token
			// from window.location's hash.
			//
			// This fails in the Firefox add-on environment when the
			// host page is at a resource:// URL , possibly due to the
			// same security restrictions that prevent the page from
			// trying to redirect itself to a resource:// URL
			//
			// Here we make the cleanupLocation() function a no-op to
			// prevent this.
			dropbox.AuthDriver.BrowserBase.cleanupLocation = () => {
				/* no-op */
			};
		}
	}

	login() : Q.Promise<string> {
		var account = Q.defer<string>();
		this.client.authenticate((err, accountID) => {
			if (err) {
				console.log('Dropbox login failed:', err);
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

	write(path: string, content: string, options: vfs.WriteOptions = {}) : Q.Promise<void> {
		var result = Q.defer<void>();
		var dropboxWriteOpts: dropbox.WriteFileOptions = {};

		if (options && options.parentRevision) {
			dropboxWriteOpts.parentRev = options.parentRevision;
			// TODO - Add support to dropbox-js for the autorename option
			// dropboxWriteOpts.autorename = false;
		}

		this.client.writeFile(path, content, dropboxWriteOpts, (error) => {
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

	private toVfsFile(file: dropbox.File.Stat) : vfs.FileInfo {
		return {
			name: file.name,
			path: file.path,
			isDir: file.isFolder,
			revision: file.versionTag
		};
	}
}

