/// <reference path="../typings/sprintf.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import http = require('http');
import Q = require('q');
import sprintf = require('sprintf');
import urlLib = require('url');

import asyncutil = require('./base/asyncutil');
import err_util = require('./base/err_util');
import streamutil = require('./base/streamutil');

export interface Reply {
	url: string;
	status: number;
	body: string;
	headers: {[index: string] : string};
}

export class BaseError extends err_util.BaseError {
	private reply: Reply;

	constructor(message: string, reply: Reply) {
		super(message);
		this.reply = reply;
	}

	status() : number {
		return this.reply.status;
	}
}

export class UnexpectedStatusError extends BaseError {
	constructor(reply: Reply) {
		super(sprintf('Unexpected response status %d', reply.status), reply);
	}
}

export class RedirectLimitExceeded extends BaseError {
	constructor(reply: Reply) {
		super('Redirect limit exceeded', reply);
	}
}

/** Utility function which takes a promise for a reply
  * and returns a promise for the content of the reply if it has
  * an expected status code or rejects the promise otherwise.
  */
export function expect(reply: Q.Promise<Reply>, status: number) : Q.Promise<string> {
	return reply.then((reply) => {
		if (reply.status == status) {
			return reply.body;
		} else {
			throw new UnexpectedStatusError(reply);
		}
	});
}

function isRedirect(reply: Reply) {
	return reply.status == 301 || reply.status == 302 || reply.status == 307;
}

export interface RequestOptions {
	redirectLimit: number;
}

export function get(url: string, opts: RequestOptions) : Q.Promise<Reply> {
	var currentUrl = url;
	var finalReply: Reply;
	var redirectCount = 0;

	return asyncutil.until(() => {
		return request('GET', currentUrl).then((reply) => {
			if (isRedirect(reply)) {
				if (opts.redirectLimit != null) {
					++redirectCount;
					if (redirectCount > opts.redirectLimit) {
						throw new RedirectLimitExceeded(reply);
					}
					currentUrl = reply.headers['Location'];
					return false;
				} else {
					// don't auto-follow redirects
					return true;
				}
			} else {
				finalReply = reply;
				return true;
			}
		});
	}).then(() => {
		return finalReply;
	});
}

interface RequestOpts {
};

export function request<T>(method: string, url: string, data?: T) : Q.Promise<Reply> {
	var urlParts = urlLib.parse(url);

	var requestOpts = {
		method: method,
		path: urlParts.path,
		host: urlParts.hostname,
		scheme: urlParts.protocol,
		port: urlParts.port,
		withCredentials: false
	};

	// strip trailing colon from protocol.
	// Node's http module treats the protocol the same with or without the trailing colon
	// but http-browserify simply appends '://' to the protocol when forming the URL.
	//
	// Would be fixed by https://github.com/substack/http-browserify/pull/42
	requestOpts.scheme = requestOpts.scheme.replace(/:$/,'');

	var response = Q.defer<Reply>();
	var request = http.request(requestOpts, (resp: http.ClientResponse) => {
		streamutil.readAll(resp)
		.then((content) => {
			response.resolve({
				url: url,
				status: resp.statusCode,
				body: content,
				headers: resp.headers
			});
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
	request.on('error', (err: any) => {
		response.reject(err);
	});
	request.end();

	return response.promise;
}

