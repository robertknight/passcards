import fs = require('fs');
import Path = require('path');

import vfs = require('./vfs');
import vfs_util = require('./util');
import { defer } from '../base/promise_util';

function convertError(error: NodeJS.ErrnoException): vfs.VfsError {
	let type = vfs.ErrorType.Other;
	if (error.code === 'ENOENT') {
		type = vfs.ErrorType.FileNotFound;
	}
	let vfsError = new vfs.VfsError(type, error.toString());
	vfsError.sourceErr = error;
	return vfsError;
}

/** VFS implementation which operates on the local filesystem */
export class FileVFS implements vfs.VFS {
	root: string;

	/** Construct a VFS implementation which operates on
	  * the local filesystem, with all paths treated as
	  * relative to @p _root
	  */
	constructor(_root: string) {
		this.root = Path.normalize(_root);
	}

	private static statToRevision(stat: fs.Stats) {
		// Ideally we would like a revision which is guaranteed to change
		// on each write to the file.
		//
		// The obvious choice is fs.Stats.mtime, but it only has a resolution
		// of 1 second in Node 0.10.x and on OS X where this is a limitation
		// of the HFS+ file system, so we append the file size to get a revision
		// which is more likely to change.
		//
		// An alternative but more expensive option would be to use a checksum
		// of the file's content
		return stat.mtime.getTime().toString() + '.' + stat.size.toString();
	}

	stat(path: string): Promise<vfs.FileInfo> {
		var result = defer<vfs.FileInfo>();
		fs.stat(this.absPath(path), (err, info) => {
			if (err) {
				result.reject(convertError(err));
				return;
			}
			result.resolve({
				name: Path.basename(path),
				path: path,
				isDir: info.isDirectory(),
				revision: FileVFS.statToRevision(info),
				lastModified: info.mtime,
				size: info.size
			});
		});
		return result.promise;
	}

	search(namePattern: string, cb: (error: Error, files: vfs.FileInfo[]) => any): void {
		vfs_util.searchIn(this, '', namePattern, cb);
	}

	read(path: string): Promise<string> {
		var result = defer<string>();
		fs.readFile(this.absPath(path), (error, content) => {
			if (error) {
				result.reject(convertError(error));
				return;
			}
			result.resolve(content.toString('binary'));
		});
		return result.promise;
	}

	write(path: string, content: string, options: vfs.WriteOptions = {}): Promise<vfs.FileInfo> {
		var result = defer<{}>();

		var fullPath = this.absPath(path);
		var tempPath = '';

		if (options.parentRevision) {
			var randomNamePart = Math.round(Math.random() * (2 << 16)).toString();
			tempPath = this.absPath(path + '.' + randomNamePart + '.tmp');
		} else {
			tempPath = fullPath;
		}

		fs.writeFile(tempPath, content, (error) => {
			if (error) {
				result.reject(convertError(error));
				return;
			}

			if (!options.parentRevision) {
				result.resolve(null);
				return;
			}

			try {
				var fileStat = fs.statSync(fullPath);
				if (FileVFS.statToRevision(fileStat) !== options.parentRevision) {
					result.reject(new vfs.VfsError(vfs.ErrorType.Conflict, path));
				}
				fs.renameSync(tempPath, fullPath);
				result.resolve(null);
			} catch (err) {
				result.reject(new vfs.VfsError(vfs.ErrorType.Conflict, path));
			}
		});

		return result.promise.then(() => this.stat(path));
	}

	list(path: string): Promise<vfs.FileInfo[]> {
		var result = defer<vfs.FileInfo[]>();
		var absPath = this.absPath(path);
		fs.readdir(absPath, (err, files) => {
			if (err) {
				result.reject(convertError(err));
				return;
			}

			var statOps: Promise<vfs.FileInfo>[] = [];
			files.forEach((name) => {
				var filePath = Path.join(path, name);
				statOps.push(this.stat(filePath));
			});
			Promise.all(statOps).then(fileInfoList => {
				result.resolve(fileInfoList);
			}).catch(err => {
				result.reject(convertError(err));
			});
		});
		return result.promise;
	}

	rmdir(path: string): Promise<void> {
		var result = defer<void>();
		fs.rmdir(this.absPath(path), (error) => {
			if (error) {
				result.reject(convertError(error));
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	rm(path: string): Promise<void> {
		var result = defer<void>();
		fs.unlink(this.absPath(path), (error) => {
			if (error) {
				// unlink() on a directory returns EISDIR on Linux and
				// EPERM under OS X, which is the POSIX-prescribed error code
				// for this condition.
				if (error.code == 'EPERM' || error.code == 'EISDIR') {
					this.rmdir(path).then(() => {
						result.resolve(null);
					}, (err) => {
							result.reject(convertError(err));
						});
				} else {
					result.reject(convertError(error));
				}
			} else {
				result.resolve(null);
			}
		});
		return result.promise;
	}

	accountInfo(): Promise<vfs.AccountInfo> {
		return Promise.reject<vfs.AccountInfo>(new Error('Not implemented'));
	}

	credentials(): vfs.Credentials {
		return {};
	}

	setCredentials(credentials: vfs.Credentials) {
		// unused
	}

	mkpath(path: string) {
		return this.mkpathInternal(path, false /* allowExisting */);
	}

	private mkpathInternal(path: string, allowExisting?: boolean): Promise<void> {
		var result = defer<void>();

		fs.mkdir(this.absPath(path), 511 /* 0777 */, (err) => {
			if (err) {
				if (err.code === 'ENOENT') {
					// parent dir does not exist. Try to create the parent dir
					// and then retry creation of the current dir
					this.mkpathInternal(Path.dirname(path), true).then(() => {
						return this.mkpathInternal(path, allowExisting);
					}).then(() => result.resolve(null))
					.catch(err => result.reject(err));
				} else if (err.code === 'EEXIST') {
					if (allowExisting) {
						this.stat(path).then((existingFile) => {
							if (existingFile.isDir) {
								result.resolve(null);
							} else {
								result.reject(convertError(err));
							}
						}).catch(err => {
							result.reject(err);
						});
					} else {
						result.reject(convertError(err));
					}
				} else {
					result.reject(convertError(err));
				}
			} else {
				result.resolve(null);
			}
		});

		return result.promise;
	}

	private absPath(path: string) {
		var fullPath = Path.normalize(Path.join(this.root, path));
		if (fullPath.length < this.root.length) {
			fullPath = this.root;
		}
		return fullPath;
	}
}
