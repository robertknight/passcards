import Q = require('q');
import sprintf = require('sprintf');
import underscore = require('underscore');

import vfs = require('./vfs');
import http_client = require('./http_client');
import stringutil = require('./stringutil');

/** VFS which accesses a file system exposed over HTTP
 * via a simple REST-like API:
 *
 * GET /path  - Read file
 * GET /path/ - Read directory. Returns a list of vfs.FileInfo objects
 * PUT /path  - Write file
 * PUT /path/ - Create directory
 * DELETE /path - Delete file
 */
export class HttpVFS implements vfs.VFS {
	constructor(public client: http_client.HttpClient) {
	}

	login() : Q.Promise<string> {
		return Q.resolve('');
	}

	isLoggedIn() : boolean {
		return true;
	}

	credentials() : Object {
		return {};
	}

	setCredentials(credentials: Object) : void {
		// unused
	}

	stat(path: string) : Q.Promise<vfs.FileInfo> {
		// stat() is implemented by listing the parent dir
		// and returning the corresponding FileInfo object from
		// that
		while (stringutil.endsWith(path, '/')) {
			path = path.slice(0, path.length-1);
		}
		var fileNameSep = path.lastIndexOf('/');
		var parentDir = path;
		var name = path;
		if (fileNameSep != -1) {
			name = name.slice(fileNameSep + 1);
			parentDir = path.slice(0, fileNameSep);
		} else {
			parentDir = '';
		}

		return this.list(parentDir).then((files) => {
			var matches = underscore.filter(files, (file) => {
				return file.name == name;
			});
			if (matches.length == 0) {
				return Q.reject(sprintf('No file %s found in %s', name, path));
			} else {
				return Q.resolve(matches[0]);
			}
		});
	}

	search(namePattern: string, cb: (files: vfs.FileInfo[]) => any) : void {
		vfs.VFSUtil.searchIn(this, '', namePattern, cb);
	}

	read(path: string) : Q.Promise<string> {
		if (stringutil.endsWith(path, '/')) {
			return Q.reject(sprintf('Cannot read file. %s is a directory', path));
		}
		return this.client.get(path);
	}

	write(path: string, content: string) : Q.Promise<void> {
		if (stringutil.endsWith(path, '/')) {
			return Q.reject(sprintf('Cannot write file. %s is a directory', path));
		}
		return this.client.put(path, content).then(() => {
			return <void>null;
		});
	}

	list(path: string) : Q.Promise<vfs.FileInfo[]> {
		if (!stringutil.endsWith(path, '/')) {
			path += '/';
		}

		return this.client.get(path).then((content) => {
			return JSON.parse(content);
		});
	}

	rm(path: string) : Q.Promise<void> {
		return this.client.delete(path).then(() => {
			return <void>null;
		});
	}

	mkpath(path: string) : Q.Promise<void> {
		if (!stringutil.endsWith(path, '/')) {
			path += '/';
		}
		return this.client.put(path, null).then(() => {
			return <void>null;
		});
	}
}

