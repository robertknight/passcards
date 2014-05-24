/// <reference path="../typings/DefinitelyTyped/urlrouter/urlrouter.d.ts"/>

import http = require('http');
import Q = require('q');
import url = require('url');

import streamutil = require('./streamutil');
import stringutil = require('./stringutil');
import vfs = require('./vfs');

/** Exposes an existing file system (eg. a local file system)
  * via a REST API for use with HttpVFS
  */
export class HttpVFSServer {
	server: http.Server;

	constructor(public fs: vfs.VFS) {
		var fail = (res: http.ServerResponse, err: any) => {
			res.statusCode = 400;
			res.end(err);
		};
		var done = (res: http.ServerResponse, content?: any) => {
			res.statusCode = 200;
			res.end(content);
		};

		var router = (req: http.ServerRequest, res: http.ServerResponse) => {
			var path = url.parse(req.url).pathname;
			if (req.method == 'GET') {
				if (stringutil.endsWith(path, '/')) {
					this.fs.list(path).then((files) => {
						done(res, JSON.stringify(files));
					}).fail((err) => {
						fail(res, err);
					});
				} else {
					this.fs.read(path).then((content) => {
						done(res, content);
					}).fail((err) => {
						fail(res, err);
					});
				}
			} else if (req.method == 'PUT') {
				if (stringutil.endsWith(path, '/')) {
					this.fs.mkpath(path).then(() => {
						done(res);
					}).fail((err) => {
						fail(res, err);
					});
				} else {
					streamutil.readAll(req).then((content) => {
						this.fs.write(path, content).then(() => {
							done(res);
						}).fail((err) => {
							fail(res, err);
						});
					});
				}
			} else if (req.method == 'DELETE') {
				this.fs.rm(path).then(() => {
					done(res);
				}).fail((err) => {
					fail(res, err);
				});
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

