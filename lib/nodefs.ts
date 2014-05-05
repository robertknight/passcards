import fs = require('fs');
import mkdirp = require('mkdirp');
import Path = require('path');
import Q = require('q');

import vfs = require('./vfs');

/** VFS implementation which operates on the local filesystem */
export class FileVFS implements vfs.VFS {
	root : string;

	constructor(_root: string) {
		this.root = _root;
	}

	stat(path: string) : Q.Promise<vfs.FileInfo> {
		var result = Q.defer<vfs.FileInfo>();
		fs.stat(this.absPath(path), (err, info) => {
			if (err) {
				result.reject(err);
				return;
			}
			var fileInfo = new vfs.FileInfo;
			fileInfo.name = Path.basename(path);
			fileInfo.path = this.absPath(path);
			fileInfo.isDir = info.isDirectory();
			result.resolve(fileInfo);
		});
		return result.promise;
	}

	searchIn(path: string, namePattern: string, cb: (files: vfs.FileInfo[]) => any) : void {
		var fileList = this.list(path);
		fileList.then((files) => {
			files.forEach((file : vfs.FileInfo) => {
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

	search(namePattern: string, cb: (files: vfs.FileInfo[]) => any) : void {
		this.searchIn('', namePattern, cb);
	}

	read(path: string) : Q.Promise<string> {
		var result = Q.defer<string>();
		fs.readFile(this.absPath(path), (error, content) => {
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
		fs.writeFile(this.absPath(path), content, (error) => {
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
		var absPath : string = this.absPath(path);
		fs.readdir(absPath, (err, files) => {
			if (err) {
				result.reject(err);
				return;
			}

			var done = 0;
			var infoList : vfs.FileInfo[] = [];
			files.forEach((name) => {
				var filePath : string = Path.join(absPath, name);
				fs.stat(filePath, (err, info) => {
					if (err) {
						console.log('Unable to stat ' + filePath);
						return;
					}

					var fi = new vfs.FileInfo;
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

	mkpath(path: string) : Q.Promise<void> {
		var result = Q.defer<void>();
		mkdirp(this.absPath(path), (err, made) => {
			if (err) {
				result.reject(err);
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	private absPath(path: string) : string {
		if (path.indexOf(this.root) != 0) {
			return Path.join(this.root, path);
		} else {
			return path;
		}
	}
}

