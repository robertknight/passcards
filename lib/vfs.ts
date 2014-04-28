/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import fs = require('fs');
import Q = require('q');
import Path = require('path');

/** Holds details of a file retrieved by a VFS implementation */
export class FileInfo {
	name: string;
	path: string;
	isDir: boolean;
}

/** Interface for async file system access.
 */
export interface VFS {
	/** Logs in to the VFS service.
	  * Returns a promise for the account ID
	  */
	login(): Q.Promise<string>;
	/** Returns true if the user is logged in */
	isLoggedIn(): boolean;
	/** Returns credentials for the logged in account.
	 * This is an opaque object which can later be restored.
	 */
	credentials() : Object;
	/** Sets the login credentials */
	setCredentials(credentials : Object) : void;

	/** Search for files whose name contains @p namePattern */
	search(namePattern: string, cb: (files: FileInfo[]) => any) : void;
	/** Read the contents of a file at @p path */
	read(path: string) : Q.Promise<string>
	/** Write the contents of a file at @p path */
	write(path: string, content: string) : Q.Promise<void>;
	/** List the contents of a directory */
	list(path: string) : Q.Promise<FileInfo[]>;
	/** Remove a file */
	rm(path: string) : Q.Promise<void>;
}

/** VFS implementation which operates on the local filesystem */
export class FileVFS implements VFS {
	root : string;

	constructor(_root: string) {
		this.root = _root;
	}

	searchIn(path: string, namePattern: string, cb: (files: FileInfo[]) => any) : void {
		var fileList = this.list(path);
		fileList.then((files) => {
			files.forEach((file : FileInfo) => {
				if (file.name.indexOf(namePattern) != -1) {
					cb([file]);
				}

				if (file.isDir) {
					this.searchIn(file.path, namePattern, cb);
				}
			});
		}, (error) => {
			throw error;
		}).done();
	}

	search(namePattern: string, cb: (files: FileInfo[]) => any) : void {
		this.searchIn('', namePattern, cb);
	}

	read(path: string) : Q.Promise<string> {
		var result = Q.defer<string>();
		fs.readFile(this.absPath(path), (error: any, content: NodeBuffer) => {
			if (error) {
				result.reject(error);
				return;
			}
			result.resolve(content.toString('binary'));
		});
		return result.promise;
	}

	write(path: string, content: string) : Q.Promise<void> {
		var result = Q.defer<void>();
		fs.writeFile(this.absPath(path), (error: any) => {
			if (error) {
				result.reject(error);
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	list(path: string) : Q.Promise<FileInfo[]> {
		var result = Q.defer<FileInfo[]>();
		var absPath : string = this.absPath(path);
		fs.readdir(absPath, (err: any, files: string[]) => {
			if (err) {
				result.reject(err);
				return;
			}

			var done = 0;
			var infoList : FileInfo[] = [];
			files.forEach((name : string) => {
				var filePath : string = Path.join(absPath, name);
				fs.stat(filePath, (err:any, info:fs.Stats) => {
					if (err) {
						console.log('Unable to stat ' + filePath);
						return;
					}

					var fi = new FileInfo;
					fi.name = name;
					fi.path = filePath;
					fi.isDir = info.isDirectory();

					infoList.push(fi);
					++done;
					if (done == files.length) {
						result.resolve(infoList);
					}
				});
			});
		});
		return result.promise;
	}

	rm(path: string) : Q.Promise<void> {
		var result = Q.defer<void>();
		fs.unlink(this.absPath(path), (error) => {
			if (error) {
				result.reject(error);
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	login() : Q.Promise<string> {
		return Q.resolve<string>(process.env.USER);
	}

	isLoggedIn() : boolean {
		return true;
	}

	credentials() : Object {
		return {};
	}

	setCredentials(credentials : Object) {
		// unused
	}

	private absPath(path: string) : string {
		if (path.indexOf(this.root) != 0) {
			return Path.join(this.root, path);
		} else {
			return path;
		}
	}
}

