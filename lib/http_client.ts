import http = require('http');
import Q = require('q');

import streamutil = require('./base/streamutil');
import stringutil = require('./base/stringutil');

/** Simple HTTP client with a promise-based API.
  *
  * Under Node.js this uses http.Client.
  *
  * TODO: Browser implementation that uses either
  *  XMLHTTPRequest directly or jQuery. Or just use
  *  browserify's 'http' implementation.
  *
  * TODO: Look for an existing library that can be used
  *  instead.
  */
export class Client {
	/** Create a new HTTP client which connects to the given
	  * hostname and port.
	  *
	  * If @p scheme is unset, the scheme from the current page is used
	  * (in a browser context) or 'http' otherwise.
	  */
	constructor(public host: string, public port: number, public scheme?: string) {
	}

	get(path: string) : Q.Promise<string> {
		return this.request('GET', path, null);
	}
	delete(path: string) : Q.Promise<string> {
		return this.request('DELETE', path, null);
	}
	post<T>(path: string, data:T) : Q.Promise<string> {
		return this.request('POST', path, data);
	}
	put<T>(path: string, data:T) : Q.Promise<string> {
		return this.request('PUT', path, data);
	}

	request<T>(method: string, path: string, data: T) : Q.Promise<string> {
		if (!stringutil.startsWith(path, '/')) {
			path = '/' + path;
		}

		var response = Q.defer<string>();
		var request = http.request({
			method: method,
			path: path,
			host: this.host,
			port: this.port,
			scheme: this.scheme,
			withCredentials: false
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
		if (data) {
			switch (typeof data) {
				case 'string':
					request.write(data);
					break;
				case 'object':
				case 'array':
					request.write(JSON.stringify(data));
					break;
				case undefined:
					break;
				default:
					throw 'Unable to serialize data type ' + typeof data;
			}
		}
		request.end();

		return response.promise;
	}
}

