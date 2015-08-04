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
import url = require('url');

import http_client = require('../http_client');
import streamutil = require('../base/streamutil');
import stringutil = require('../base/stringutil');
import vfs = require('./vfs');
import vfs_util = require('./util');

export const ACCESS_TOKEN = 'dummytoken';

/** VFS which accesses a file system exposed over HTTP
 * via a simple REST-like API. It implements a fake OAuth
 * authorization endpoint for use in testing.
 *
 * GET /files/path  - Read file
 * GET /files/path/ - Read directory. Returns a list of vfs.FileInfo objects
 * PUT /files/path  - Write file
 * PUT /files/path/ - Create directory
 * DELETE /files/path - Delete file
 *
 * GET /auth/authorize - OAuth2 authorization endpoint.
 */
export class Client implements vfs.VFS {
	private _credentials: vfs.Credentials;

	constructor(public url: string) {
	}

	authURL() {
		return `${this.url}/auth/authorize`;
	}

	credentials(): vfs.Credentials {
		return this._credentials;
	}

	setCredentials(credentials: vfs.Credentials): void {
		this._credentials = credentials;
	}

	accountInfo() {
		let account: vfs.AccountInfo = {
			userId: '42',
			name: 'John Doe',
			email: 'john.doe@gmail.com'
		};
		return Q(account);
	}

	stat(path: string): Q.Promise<vfs.FileInfo> {
		// stat() is implemented by listing the parent dir
		// and returning the corresponding FileInfo object from
		// that
		while (stringutil.endsWith(path, '/')) {
			path = path.slice(0, path.length - 1);
		}
		let fileNameSep = path.lastIndexOf('/');
		let parentDir = path;
		let name = path;
		if (fileNameSep != -1) {
			name = name.slice(fileNameSep + 1);
			parentDir = path.slice(0, fileNameSep);
		} else {
			parentDir = '';
		}

		return this.list(parentDir).then(files => {
			let matches = files.filter(file => file.name === name);
			if (matches.length == 0) {
				throw new vfs.VfsError(vfs.ErrorType.FileNotFound, `No file ${name} found in ${path}`);
			} else {
				return Q(matches[0]);
			}
		});
	}

	search(namePattern: string, cb: (error: Error, files: vfs.FileInfo[]) => any): void {
		vfs_util.searchIn(this, '', namePattern, cb);
	}

	read(path: string): Q.Promise<string> {
		if (stringutil.endsWith(path, '/')) {
			return Q.reject<string>(new Error(`Cannot read file. ${path} is a directory`));
		}
		return this.request('GET', path).then(reply => {
			if (reply.status !== 200) {
				throw this.translateError(reply);
			} else {
				return reply.body;
			}
		});
	}

	write(path: string, content: string): Q.Promise<vfs.FileInfo> {
		if (stringutil.endsWith(path, '/')) {
			return Q.reject<vfs.FileInfo>(new Error(`Cannot write file. ${path} is a directory`));
		}
		return this.request('PUT', path, content).then(reply => {
			if (reply.status !== 200) {
				throw this.translateError(reply);
			} else {
				return this.stat(path);
			}
		});
	}

	list(path: string): Q.Promise<vfs.FileInfo[]> {
		if (!stringutil.endsWith(path, '/')) {
			path += '/';
		}

		return this.request('GET', path).then(reply => {
			if (reply.status !== 200) {
				throw this.translateError(reply);
			} else {
				return JSON.parse(reply.body);
			}
		});
	}

	rm(path: string): Q.Promise<void> {
		return this.request('DELETE', path).then(reply => {
			if (reply.status !== 200) {
				throw this.translateError(reply);
			}
		});
	}

	mkpath(path: string): Q.Promise<void> {
		if (!stringutil.endsWith(path, '/')) {
			path += '/';
		}
		return this.request('PUT', path, null).then(reply => {
			if (reply.status !== 200) {
				throw this.translateError(reply);
			}
		});
	}

	private translateError(reply: http_client.Reply) {
		let errorType = vfs.ErrorType.Other;
		switch (reply.status) {
			case 401:
			// fallthrough
			case 403:
				errorType = vfs.ErrorType.AuthError;
				break;
			case 404:
				errorType = vfs.ErrorType.FileNotFound;
				break;
			case 409:
				errorType = vfs.ErrorType.Conflict;
				break;
		}
		return new vfs.VfsError(errorType, reply.body);
	}

	private fileURL(path: string) {
		if (!stringutil.startsWith(path, '/')) {
			path = `/${path}`;
		}
		return `${this.url}/files/${path}`;
	}

	private request(method: string, path: string, data?: any): Q.Promise<http_client.Reply> {
		if (!this._credentials) {
			return Q.reject<http_client.Reply>(new vfs.VfsError(vfs.ErrorType.AuthError, 'User is not authenticated'));
		}
		let requestOpts: http_client.RequestOpts = {
			headers: {
				['Authentication']: `Bearer ${this._credentials.accessToken}`
			}
		};
		return http_client.request(method, this.fileURL(path), data, requestOpts);
	}
}

/** Exposes an existing file system (eg. a local file system)
  * via a REST API for use with HttpVFS
  */
export class Server {
	server: http.Server;

	constructor(public fs: vfs.VFS) {
		this.server = http.createServer(this.handleRequest.bind(this));
	}

	listen(port: number): Q.Promise<void> {
		var ready = Q.defer<void>();
		this.server.listen(port, () => {
			ready.resolve(null);
		});
		this.server.on('clientError', (ex: any) => {
			console.log('server client connection err', ex);
		});
		return ready.promise;
	}

	close() {
		this.server.close();
	}

	private handleRequest(req: http.ServerRequest, res: http.ServerResponse) {
		let parsedURL = url.parse(req.url, true /* parse query string */);
		if (parsedURL.pathname.match(/^\/files\//)) {
			this.handleFileRequest(req, res);
		} else if (parsedURL.pathname === '/auth/authorize') {
			// mock OAuth endpoint
			let accessToken = ACCESS_TOKEN;
			let redirectURL = parsedURL.query.redirect_uri;
			if (!redirectURL) {
				res.statusCode = 400;
				res.end('redirect_uri parameter not specified');
				return;
			}
			res.statusCode = 200;
			res.end(
				`
<html>
<body>
Authorize app?
<button id="authButton">Authorize</button>
<script>
document.getElementById('authButton').addEventListener('click', function() {
	document.location.href = '${redirectURL}#access_token=${accessToken}';
});
</script>
</form>
</body>
</html>
`
				);
		} else {
			res.statusCode = 404;
			res.end('Unknown route');
		}
	}

	private handleFileRequest(req: http.ServerRequest, res: http.ServerResponse) {
		let fail = (err: any) => {
			res.statusCode = 400;
			res.end(JSON.stringify(err));
		};
		let done = (content?: any) => {
			res.statusCode = 200;
			res.end(content, 'binary');
		};

		if (req.headers['authentication'] !== `Bearer ${ACCESS_TOKEN}`) {
			res.statusCode = 403;
			res.end(JSON.stringify({
				error: 'Incorrect or missing access token'
			}));
			return;
		}

		res.setHeader('Access-Control-Allow-Origin', '*');
		let path = url.parse(req.url).pathname.replace(/^\/files\//, '');
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
	}
}

export const DEFAULT_PORT = 3030;
export const DEFAULT_URL = `http://localhost:${DEFAULT_PORT}`;

function main() {
	var nodefs = require('./node');

	var port = DEFAULT_PORT;

	var dirPath = process.argv[2] || process.cwd();
	var server = new Server(new nodefs.FileVFS(dirPath));
	server.listen(port).then(() => {
		console.log('Exposing %s via HTTP port %d', dirPath, port);
	});
}

if (require.main == module) {
	main();
}
