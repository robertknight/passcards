/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import asyncutil = require('./asyncutil');
import Q = require('q');

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

	/** Returns the metadata of the file at the given path */
	stat(path: string) : Q.Promise<FileInfo>;
	/** Search for files whose name contains @p namePattern */
	search(namePattern: string, cb: (files: FileInfo[]) => any) : void;
	/** Read the contents of a file at @p path */
	read(path: string) : Q.Promise<string>
	/** Write the contents of a file at @p path */
	write(path: string, content: string) : Q.Promise<void>;
	/** List the contents of a directory */
	list(path: string) : Q.Promise<FileInfo[]>;
	/** Remove a file or directory */
	rm(path: string) : Q.Promise<void>;
	/** Create all directories along the path to @p path */
	mkpath(path: string) : Q.Promise<void>;
}

/** Utility functions for virtual file system operations,
  * built on top of the main VFS interface methods.
  */
export class VFSUtil {
	/** Remove the directory @p path and all of its contents, if it exists. */
	static rmrf(fs: VFS, path: string) : Q.Promise<void> {
		var result = Q.defer<void>();

		fs.stat(path).then(() => {
			var fileList = fs.list(path);
			var removeOps : Q.Promise<any>[] = [];
			fileList.then((files) => {
				files.forEach((file) => {
					if (file.isDir) {
						removeOps.push(VFSUtil.rmrf(fs, file.path));
					} else {
						removeOps.push(fs.rm(file.path));
					}
				});

				asyncutil.resolveWithValue(result, Q.all(removeOps).then(() => {
					return fs.rm(path);
				}), null);
			}).done();
		}, (err) => {
			// TODO - Only resolve the promise if
			// the error is that the file does not exist
			result.resolve(null);
		}).done();

		return result.promise;
	}

	/** Recursively enumerate the contents of @p path */
	static listRecursive(fs: VFS, src: string) : Q.Promise<FileInfo[]> {
		var result = Q.defer<FileInfo[]>();

		fs.list(src).then((files) => {
			var listOps : Q.Promise<FileInfo[]>[] = [];
			files.forEach((file) => {
				if (file.isDir) {
					listOps.push(VFSUtil.listRecursive(fs, file.path));
				}
			});

			var allFiles = files;
			Q.all(listOps).then((subdirFiles) => {
				subdirFiles.forEach((files) => {
					allFiles = allFiles.concat(files);
				});
				result.resolve(allFiles);
			}).done();
		}).done();

		return result.promise;
	}

	/** Copy the directory @p path and all of its contents to a new location */
	static cp(fs: VFS, src: FileInfo, dest: string) : Q.Promise<void> {
		if (src.isDir) {
			return fs.mkpath(dest).then(() => {
				return fs.list(src.path);
			})
			.then((srcFiles) => {
				var copyOps : Q.Promise<void>[] = [];
				srcFiles.forEach((srcFile) => {
					var destPath = dest + '/' + srcFile.name;
					copyOps.push(VFSUtil.cp(fs, srcFile, destPath));
				});
				return asyncutil.eraseResult(Q.all(copyOps));
			})
		} else {
			return fs.read(src.path).then((content) => {
				return fs.write(dest, content);
			})
		}
	}
}

