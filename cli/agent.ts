/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

import Q = require('q');

import agent_server = require('./agent_server');
import http_client = require('../lib/http_client');
import onepass = require('../lib/onepass');

export class HttpKeyAgent implements onepass.KeyAgent {
	private agentPID : Q.Promise<number>;
	private client : http_client.Client

	constructor() {
		this.agentPID = agent_server.startAgent();
		this.client = new http_client.Client('localhost', agent_server.AGENT_PORT);
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
		this.sendRequest<agent_server.DecryptRequest>('POST', '/decrypt', {
			id: id,
			algo: onepass.CryptoAlgorithm.AES128_OpenSSLKey,
			cipherText: cipherText
		}).then((result) => {
			plainText.resolve(result);
		}).done();
		return plainText.promise;
	}

	encrypt(id: string, plainText: string, params: onepass.CryptoParams) : Q.Promise<string> {
		var cipherText = Q.defer<string>();
		this.sendRequest<agent_server.EncryptRequest>('POST', '/encrypt', {
			id: id,
			algo: onepass.CryptoAlgorithm.AES128_OpenSSLKey,
			plainText: plainText
		}).then((result) => {
			cipherText.resolve(result);
		}).done();
		return cipherText.promise;
	}

	private sendRequest<T>(method: string, path: string, data: T) : Q.Promise<string> {
		return this.agentPID.then(() => {
			return this.client.request(method, path, data);
		});
	}
}
