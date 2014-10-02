import fs = require('fs');
import mkdirp = require('mkdirp');
import Path = require('path');
import Q = require('q');

import vfs = require('./vfs');

/** VFS implementation which operates on the local filesystem */
export class FileVFS implements vfs.VFS {
	root : string;

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

	stat(path: string) : Q.Promise<vfs.FileInfo> {
		var result = Q.defer<vfs.FileInfo>();
		fs.stat(this.absPath(path), (err, info) => {
			if (err) {
				result.reject(err);
				return;
			}
			var fileInfo = {
				name: Path.basename(path),
				path: path,
				isDir: info.isDirectory(),
				revision: FileVFS.statToRevision(info)
			};
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
		vfs.VFSUtil.searchIn(this, '', namePattern, cb);
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

	write(path: string, content: string, options: vfs.WriteOptions = {}) : Q.Promise<void> {
		var result = Q.defer<void>();

		var fullPath = this.absPath(path);
		var tempPath = '';

		if (options.parentRevision) {
			var randomNamePart = Math.round(Math.random() * (2<<16)).toString();
			tempPath = this.absPath(path + '.' + randomNamePart +  '.tmp');
		} else {
			tempPath = fullPath;
		}

		fs.writeFile(tempPath, content, (error) => {
			if (error) {
				result.reject(error);
				return;
			}

			if (!options.parentRevision) {
				result.resolve(null);
				return;
			}

			try {
				var fileStat = fs.statSync(fullPath);
				if (FileVFS.statToRevision(fileStat) !== options.parentRevision) {
					result.reject(new vfs.ConflictError(path));
				}
				fs.renameSync(tempPath, fullPath);
				result.resolve(null);
			} catch (err) {
				result.reject(new vfs.ConflictError(path));
			}
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

			var statOps : Q.Promise<vfs.FileInfo>[] = [];
			files.forEach((name) => {
				var filePath : string = Path.join(path, name);
				statOps.push(this.stat(filePath));
			});
			Q.all(statOps).then((fileInfoList) => {
				result.resolve(fileInfoList);
			}).done();
		});
		return result.promise;
	}

	rmdir(path: string) : Q.Promise<void> {
		var result = Q.defer<void>();
		fs.rmdir(this.absPath(path), (error) => {
			if (error) {
				result.reject(error);
				return;
			}
			result.resolve(null);
		});
		return result.promise;
	}

	rm(path: string) : Q.Promise<void> {
		var result = Q.defer<void>();
		fs.unlink(this.absPath(path), (error) => {
			if (error) {
				// unlink() on a directory returns EISDIR on Linux and
				// EPERM under OS X, which is the POSIX-prescribed error code
				// for this condition.
				if (error.code == 'EPERM' || error.code == 'EISDIR') {
					this.rmdir(path).then(() => {
						result.resolve(null);
					}, (err) => {
						result.reject(err);
					}).done();
				} else {
					result.reject(error);
				}
			} else {
				result.resolve(null);
			}
		});
		return result.promise;
	}

	login() : Q.Promise<string> {
		return Q<string>(process.env.USER);
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
			var fullPath = Path.normalize(Path.join(this.root, path));
			if (fullPath.length < this.root.length) {
				fullPath = this.root;
			}
			return fullPath;
		} else {
			return path;
		}
	}
}

