/// <reference path="../../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');

export function readAll(readable: NodeJS.ReadableStream) : Q.Promise<string> {
	var result = Q.defer<string>();
	var body = '';
	readable.on('data', (chunk: string) => {
		body += chunk;
	});
	readable.on('end', () => {
		result.resolve(body);
	});
	return result.promise;
}

export function readJSON(readable: NodeJS.ReadableStream) : Q.Promise<any> {
	return readAll(readable).then((content) => {
		return Q.resolve(JSON.parse(content));
	});
}

