import http = require('http');
import https = require('https');
import urlLib = require('url');

import assign = require('./base/assign');
import asyncutil = require('./base/asyncutil');
import err_util = require('./base/err_util');
import streamutil = require('./base/streamutil');
import { defer } from './base/promise_util';

export interface Reply {
    url: string;
    status: number;
    body: string;
    headers: { [index: string]: string|string[] };
}

export class BaseError extends err_util.BaseError {
    private reply: Reply;

    constructor(message: string, reply: Reply) {
        super(message);
        this.reply = reply;
    }

    status(): number {
        return this.reply.status;
    }
}

export class UnexpectedStatusError extends BaseError {
    constructor(reply: Reply) {
        super(`Unexpected response status ${reply.status}`, reply);
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
export function expect(reply: Promise<Reply>, status: number): Promise<string> {
    return reply.then(reply => {
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

export function get(url: string, opts?: RequestOptions): Promise<Reply> {
    var currentUrl = url;
    var finalReply: Reply;
    var redirectCount = 0;

    opts = opts || {
        redirectLimit: 0,
    };

    return asyncutil
        .until(() => {
            return request('GET', currentUrl).then(reply => {
                if (isRedirect(reply)) {
                    if (opts.redirectLimit != null) {
                        ++redirectCount;
                        if (redirectCount > opts.redirectLimit) {
                            throw new RedirectLimitExceeded(reply);
                        }
                        currentUrl = reply.headers['location'] as string;
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
        })
        .then(() => {
            return finalReply;
        });
}

export interface RequestOpts {
    headers?: { [name: string]: string };
}

export function request<T>(
    method: string,
    url: string,
    data?: T,
    opts?: RequestOpts
): Promise<Reply> {
    let urlParts = urlLib.parse(url);

    let requestOpts = {
        method: method,
        path: urlParts.path,
        host: urlParts.hostname,
        scheme: urlParts.protocol,
        port: urlParts.port,
        withCredentials: false,
        responseType: 'arraybuffer',

        headers: {},
    };

    if (opts) {
        if (opts.headers) {
            requestOpts.headers = assign(requestOpts.headers, opts.headers);
        }
    }

    // strip trailing colon from protocol.
    // Node's http module treats the protocol the same with or without the trailing colon
    // but http-browserify simply appends '://' to the protocol when forming the URL.
    //
    // Would be fixed by https://github.com/substack/http-browserify/pull/42
    requestOpts.scheme = requestOpts.scheme.replace(/:$/, '');

    let requestFunc: (
        opts: any,
        callback: (resp: http.ClientResponse) => void
    ) => http.ClientRequest;
    if (requestOpts.scheme == 'https') {
        requestFunc = https.request;
    } else {
        requestFunc = http.request;
    }

    let response = defer<Reply>();
    let request = requestFunc(requestOpts, (resp: http.ClientResponse) => {
        streamutil
            .readAll(resp)
            .then(content => {
                response.resolve({
                    url: url,
                    status: resp.statusCode,
                    body: content,
                    headers: resp.headers,
                });
            })
            .catch(err => response.reject(err));
    });

    if (data) {
        switch (typeof data) {
            case 'string':
                request.write(data);
                break;
            case 'object':
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
