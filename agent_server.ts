/// <reference path="typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="typings/DefinitelyTyped/urlrouter/urlrouter.d.ts" />

import child_process = require('child_process');
import fs = require('fs');
import http = require('http');
import path = require('path');
import Q = require('q');
import urlrouter = require('urlrouter');

import consoleio = require('./lib/console');
import crypto = require('./lib/onepass_crypto');
import streamutil = require('./lib/streamutil');

export interface DecryptRequest {
	id : string;
	algo : string;
	salt : string;
	cipherText : string
}

export interface AddKeyRequest {
	id : string;
	key : string;
}

export var AGENT_LOG = '/tmp/1pass-agent.log';
export var AGENT_PID_FILE = '/tmp/1pass-agent.pid';

function currentVersion() : string {
	return fs.statSync(__filename).mtime.toString();
}

function logf(format: string, ...args: any[]) {
	consoleio.printf.apply(null, [new consoleio.ConsoleIO, format].concat(args));
}

function parseJSONRequest(req: http.ServerRequest, rsp: http.ServerResponse, cb: (content: any) => void) {
	streamutil.readJSON(req)
	.then(cb)
	.fail((err) => {
		console.log(err);
		rsp.statusCode = 400;
		rsp.end('Failed to parse request: ' + err);
	}).done();
}

class Server {
	private crypto : crypto.CryptoImpl;
	private httpServer : http.Server;
	private keys : {[id:string]: string}

	constructor() {
		this.crypto = new crypto.CryptoJsCrypto();
		this.keys = {};

		var self = this;
		var router = urlrouter((app) => {
			app.post('/keys', (req, res) => {
				parseJSONRequest(req, res, (params: AddKeyRequest) => {
					logf('received key %s', params.id);
					this.keys[params.id] = params.key;
					res.end('Key added');
				});
			});
			app.get('/keys', (req, res) => {
				res.end(JSON.stringify(Object.keys(this.keys)));
			});
			app.post('/decrypt', (req, res) => {
				parseJSONRequest(req, res, (params: DecryptRequest) => {
					if (!this.keys.hasOwnProperty(params.id)) {
						logf('Decrypt failed - unknown key %s', params.id);
						res.statusCode = 404;
						res.end('No such key found');
					}
					switch (params.algo) {
						case 'aes-128-openssl':
							var plainText = crypto.decryptAgileKeychainItemData(this.crypto, this.keys[params.id],
							  params.salt, params.cipherText);

							logf('Decrypted (%d => %d) bytes with key %s', params.cipherText.length,
							  plainText.length, params.id);

							res.end(plainText);
							break;
						default:
							logf('Decrypt failed - unknown algorithm');
							res.statusCode = 400;
							res.end('Unsupported encryption algorithm');
					}
				});
			});
			app.delete('/keys', (req, res) => {
				logf('forgetting keys');
				self.keys = {};
				res.end();
			});
			app.get('/version', (req, res) => {
				res.end(currentVersion());
			});
		});
		this.httpServer = http.createServer(router);
	}

	listen(port: number) : Q.Promise<void> {
		var ready = Q.defer<void>();
		this.httpServer.listen(port, () => {
			logf('Agent listening on port %d', port);
			ready.resolve(null);
		});
		return ready.promise;
	}
}

function isCurrentVersionRunning() : Q.Promise<boolean> {
	var result = Q.defer<boolean>();
	var req = http.get({host: 'localhost', port: 3000, path: '/version'}, (resp: http.ClientResponse) => {
		streamutil.readAll(resp).then((content) => {
			if (content == currentVersion()) {
				result.resolve(true);
			} else {
				result.resolve(false);
			}
		});
	});
	req.on('error', () => {
		result.resolve(false);
	});
	return result.promise;
}

export function agentPID() : number {
	try {
		var pid = parseInt(fs.readFileSync(AGENT_PID_FILE).toString());
		return pid;
	} catch (ex) {
		// agent not already running
		return null;
	}
}

function launchAgent() : Q.Promise<number> {
	var pid = Q.defer<number>();

	var agentOut = fs.openSync(AGENT_LOG, 'a');
	var agentErr = fs.openSync(AGENT_LOG, 'a');

	fs.watchFile(AGENT_PID_FILE, {
		persistent: true,
		interval: 5
	}, () => {
		fs.unwatchFile(AGENT_PID_FILE);
		pid.resolve(agentPID());
	});

	var server = child_process.spawn('node', [path.join(__dirname, 'agent_server')], {
		detached: true,
		stdio: ['ignore', agentOut, agentErr]
	});
	server.on('error', (err: any) => {
		console.log(err);
	});
	(<any>server).unref();

	return pid.promise;
}

export function startAgent() : Q.Promise<number> {
	var existingPID = agentPID();
	if (existingPID) {
		var pid = Q.defer<number>();
		isCurrentVersionRunning().then((isCurrent) => {
			if (isCurrent) {
				pid.resolve(existingPID);
			} else {
				stopAgent().then(launchAgent).then((newVersionPID) => {
					pid.resolve(newVersionPID);
				});
			}
		}).done();
		return pid.promise;
	} else {
		return launchAgent();
	}
}

export function stopAgent() : Q.Promise<void> {
	var pid = agentPID();
	if (!pid) {
		return Q.resolve<void>(null);
	}
	try {
		process.kill(pid);
	} catch (ex) {
		if (ex.code == 'ESRCH') {
			// no such process
			return Q.resolve<void>(null);
		}
		return Q.reject('Failed to stop agent:' + ex);
	}
	return Q.resolve<void>(null);
}

if (require.main === module) {
	var server = new Server();
	server.listen(3000).then(() => {
		fs.writeFileSync(AGENT_PID_FILE, process.pid);
	});
}

