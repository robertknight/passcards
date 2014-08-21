/// <reference path="../../typings/sprintf.d.ts" />

// http_vfs provides a client and server for a simple file-system
// interface exposed via a RESTish API.
//
// It supports basic CRUD operations on files and directories.
//
// The module can be run as a server using
//   node http_vfs.js $PATH
//
// Which will expose the local file system dir $PATH
// via this API.
//
import Q = require('q');
import http = require('http');
import sprintf = require('sprintf');
import underscore = require('underscore');
import url = require('url');

import vfs = require('./vfs');
import http_client = require('../http_client');
import streamutil = require('../base/streamutil');
import stringutil = require('../base/stringutil');

/** VFS which accesses a file system exposed over HTTP
 * via a simple REST-like API:
 *
 * GET /path  - Read file
 * GET /path/ - Read directory. Returns a list of vfs.FileInfo objects
 * PUT /path  - Write file
 * PUT /path/ - Create directory
 * DELETE /path - Delete file
 */
export class Client implements vfs.VFS {
	constructor(public url: string) {
	}

	login() : Q.Promise<string> {
		return Q('');
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
				return Q(matches[0]);
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
		return http_client.expect(this.request('GET', path), 200).then((content) => {
			return content;
		});
	}

	write(path: string, content: string) : Q.Promise<void> {
		if (stringutil.endsWith(path, '/')) {
			return Q.reject(sprintf('Cannot write file. %s is a directory', path));
		}
		return http_client.expect(this.request('PUT', path, content), 200).then(() => {
			return <void>null;
		});
	}

	list(path: string) : Q.Promise<vfs.FileInfo[]> {
		if (!stringutil.endsWith(path, '/')) {
			path += '/';
		}

		return http_client.expect(this.request('GET', path), 200).then((content) => {
			return JSON.parse(content);
		});
	}

	rm(path: string) : Q.Promise<void> {
		return http_client.expect(this.request('DELETE', path), 200).then(() => {
			return <void>null;
		});
	}

	mkpath(path: string) : Q.Promise<void> {
		if (!stringutil.endsWith(path, '/')) {
			path += '/';
		}
		return http_client.expect(this.request('PUT', path, null), 200).then(() => {
			return <void>null;
		});
	}

	private request(method: string, path: string, data?: any) : Q.Promise<http_client.Reply> {
		var reqUrl = this.url;
		if (!stringutil.startsWith(path, '/')) {
			reqUrl += '/';
		}
		reqUrl += path;
		return http_client.request(method, reqUrl, data);
	}
}

/** Exposes an existing file system (eg. a local file system)
  * via a REST API for use with HttpVFS
  */
export class Server {
	server: http.Server;

	constructor(public fs: vfs.VFS) {
		var router = (req: http.ServerRequest, res: http.ServerResponse) => {
			var fail = (err: any) => {
				res.statusCode = 400;
				res.end(JSON.stringify(err));
			};
			var done = (content?: any) => {
				res.statusCode = 200;
				res.end(content);
			};
			res.setHeader('Access-Control-Allow-Origin', '*');
			var path = url.parse(req.url).pathname;
			if (req.method == 'GET') {
				this.fs.stat(path).then((fileInfo) => {
					if (fileInfo.isDir) {
						this.fs.list(path).then((files) => {
							done(JSON.stringify(files));
						}).catch((err) => {
							fail(err);
						});
					} else {
						this.fs.read(path).then((content) => {
							done(content);
						}).catch((err) => {
							fail(err);
						});
					}
				}).catch((err) => {
					fail(err);
				});
			} else if (req.method == 'PUT') {
				if (stringutil.endsWith(path, '/')) {
					this.fs.mkpath(path).then(() => {
						done();
					}).catch((err) => {
						fail(err);
					});
				} else {
					streamutil.readAll(req).then((content) => {
						this.fs.write(path, content).then(() => {
							done();
						}).catch((err) => {
							fail(err);
						});
					});
				}
			} else if (req.method == 'DELETE') {
				this.fs.rm(path).then(() => {
					done();
				}).catch((err) => {
					fail(err);
				});
			} else if (req.method == 'OPTIONS') {
				res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE');
				done();
			} else {
				throw 'Unhandled method ' + req.method;
			}
		};

		this.server = http.createServer(router);
	}

	listen(port: number) : Q.Promise<void> {
		var ready = Q.defer<void>();
		this.server.listen(port, () => {
			ready.resolve(null);
		});
		this.server.on('clientError', (ex:any) => {
			console.log('server client connection err', ex);
		});
		return ready.promise;
	}

	close() {
		this.server.close();
	}
}

function main() {
	var nodefs = require('./node');
	var sprintf = require('sprintf');

	var port = 3030;

	var dirPath = process.argv[2] || process.cwd();
	var server = new Server(new nodefs.FileVFS(dirPath));
	server.listen(port).then(() => {
		console.log(sprintf('Exposing %s via HTTP port %d', dirPath, port));
	});
}

if (require.main == module) {
	main();
}

