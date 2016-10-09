import Q = require('q');
import Path = require('path');

import asyncutil = require('../base/asyncutil');
import vfs = require('./vfs');
import { defer } from '../base/promise_util';

/** Utility functions for virtual file system operations,
  * built on top of the main vfs.VFS interface methods.
  */

/** Remove the directory @p path and all of its contents, if it exists. */
export function rmrf(fs: vfs.VFS, path: string): Q.Promise<void> {
	var result = defer<void>();

	fs.stat(path).then(() => {
		var fileList = fs.list(path);
		var removeOps: Q.Promise<any>[] = [];
		fileList.then((files) => {
			files.forEach((file) => {
				if (file.isDir) {
					removeOps.push(rmrf(fs, file.path));
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
export function listRecursive(fs: vfs.VFS, src: string): Q.Promise<vfs.FileInfo[]> {
	var result = defer<vfs.FileInfo[]>();

	fs.list(src).then((files) => {
		var listOps: Q.Promise<vfs.FileInfo[]>[] = [];
		files.forEach((file) => {
			if (file.isDir) {
				listOps.push(listRecursive(fs, file.path));
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
export function cp(fs: vfs.VFS, src: vfs.FileInfo, dest: string): Q.Promise<{}> {
	if (src.isDir) {
		return fs.mkpath(dest).then(() => {
			return fs.list(src.path);
		})
		.then((srcFiles) => {
			var copyOps: Q.Promise<{}>[] = [];
			srcFiles.forEach((srcFile) => {
				var destPath = dest + '/' + srcFile.name;
				copyOps.push(cp(fs, srcFile, destPath));
			});
			return Q.all(copyOps);
		})
	} else {
		return fs.read(src.path).then((content) => {
			return fs.write(dest, content);
		})
	}
}

/** Search a file system for files whose name matches a given pattern,
  * using vfs.VFS.list() recursively.
  *
  * vfs.VFS.search() should be used by clients instead of this method as
  * some vfs.VFS implementations may use a faster method.
  */
export function searchIn(fs: vfs.VFS, path: string, namePattern: string,
				cb: (error: Error, files: vfs.FileInfo[]) => any): void {
	var fileList = fs.list(path);
	fileList.then((files) => {
		files.forEach((file) => {
			if (file.name.indexOf(namePattern) != -1) {
				cb(null, [file]);
			}

			if (file.isDir) {
				searchIn(fs, file.path, namePattern, cb);
			}
		});
	}, (error) => {
			cb(error, null);
		}).done();
}

export function mktemp(fs: vfs.VFS, path: string, template = 'tmp.XXX') {
	var baseName = template.replace(/X{3,}/, (match) => {
		var randomized = '';
		for (var i = 0; i < match.length; i++) {
			randomized += String.fromCharCode(97 /* 'a' */ + Math.round(Math.random() * 25));
		}
		return randomized;
	});

	var tempPath = Path.join(path, baseName);
	return fs.mkpath(tempPath).then(() => {
		return tempPath;
	});
}

/** Read and parse the contents of a JSON file and return
  * the result as an object of type T
  */
export function readJSON<T>(fs: vfs.VFS, path: string) {
	return fs.read(path).then(json => <T>JSON.parse(json));
}
