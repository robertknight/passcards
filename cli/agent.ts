import Q = require('q');

import { atob, btoa } from '../lib/base/stringutil';
import { defer } from '../lib/base/promise_util';
import agent_server = require('./agent_server');
import http_client = require('../lib/http_client');
import key_agent = require('../lib/key_agent');

export class HttpKeyAgent implements key_agent.KeyAgent {
	private agentPID: Q.Promise<number>;
	private agentUrl: string;

	constructor() {
		this.agentPID = agent_server.startAgent();
		this.agentUrl = 'http://localhost:' + agent_server.AGENT_PORT;
	}

	addKey(id: string, key: string): Q.Promise<void> {
		return this.sendRequest('POST', '/keys', {
			id: id,
			key: btoa(key)
		}).then(() => null);
	}

	listKeys(): Q.Promise<string[]> {
		return this.sendRequest('GET', '/keys', {}).then((reply) => {
			return JSON.parse(reply);
		});
	}

	forgetKeys(): Q.Promise<void> {
		return this.sendRequest('DELETE', '/keys', {}).then(() => null);
	}

	decrypt(id: string, cipherText: string, params: key_agent.CryptoParams): Q.Promise<string> {
		return this.sendRequest<agent_server.DecryptRequest>('POST', '/decrypt', {
			id: id,
			algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey,
			cipherText: btoa(cipherText)
		}).then(result => atob(result));
	}

	encrypt(id: string, plainText: string, params: key_agent.CryptoParams): Q.Promise<string> {
		return this.sendRequest<agent_server.EncryptRequest>('POST', '/encrypt', {
			id: id,
			algo: key_agent.CryptoAlgorithm.AES128_OpenSSLKey,
			plainText: btoa(plainText)
		}).then(result => atob(result));
	}

	resetAutoLock() {
		// not-implemented
	}

	private sendRequest<T>(method: string, path: string, data: T): Q.Promise<string> {
		return this.agentPID.then(() => {
			var url = this.agentUrl + path;
			return http_client.expect(http_client.request(method, url, data), 200);
		});
	}
}
