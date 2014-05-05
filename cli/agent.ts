/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

import http = require('http');
import Q = require('q');

import agent_server = require('./agent_server');
import onepass = require('../lib/onepass');
import streamutil = require('../lib/streamutil');

export class HttpKeyAgent implements onepass.KeyAgent {
	private agentPID : Q.Promise<number>;

	constructor() {
		this.agentPID = agent_server.startAgent();
	}

	addKey(id: string, key: string) : Q.Promise<void> {
		var done = Q.defer<void>();
		this.sendRequest('POST', '/keys', {
			id: id,
			key: key
		}).then((reply) => {
			done.resolve(null);
		}).done();
		return done.promise;
	}

	listKeys() : Q.Promise<string[]> {
		var keys = Q.defer<string[]>();
		this.sendRequest('GET', '/keys', {}).then((reply) => {
			keys.resolve(JSON.parse(reply));
		}).done();
		return keys.promise;
	}

	forgetKeys() : Q.Promise<void> {
		var done = Q.defer<void>();
		this.sendRequest('DELETE', '/keys', {}).then(() => {
			done.resolve(null);
		}).done();
		return done.promise;
	}

	decrypt(id: string, cipherText: string, params: onepass.CryptoParams) : Q.Promise<string> {
		var plainText = Q.defer<string>();
		this.sendRequest('POST', '/decrypt', {
			id: id,
			algo: 'aes-128-openssl',
			salt: params.salt,
			cipherText: cipherText
		}).then((result) => {
			plainText.resolve(result);
		}).done();
		return plainText.promise;
	}

	private sendRequest(method: string, path: string, data: any) : Q.Promise<string> {
		var response = Q.defer<string>();
		var dispatchRequest = () => {
			var request = http.request({
				method: method,
				path: path,
				host: 'localhost',
				port: 3000
			}, (resp: http.ClientResponse) => {
				streamutil.readAll(resp)
				.then((content) => {
					if (resp.statusCode == 200) {
						response.resolve(content);
					} else {
						response.reject({status: resp.statusCode, body: content});
					}
				}, (err) => {
					response.reject(err);
				}).done();
			});
			request.write(JSON.stringify(data));
			request.end();

			request.on('error', (err: any) => {
				response.reject(err);
			});
		};

		this.agentPID.then(() => {
			dispatchRequest();
		});

		return response.promise;
	}
}
