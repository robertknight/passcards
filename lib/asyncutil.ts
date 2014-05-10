/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');

/** Resolve or reject promise `a` with the result of promise `b` */
export function resolveWith<T>(a: Q.Deferred<T>, b: Q.Promise<T>) : void {
	b.then((result) => {
		a.resolve(result);
	})
	.fail((err) => {
		a.reject(err);
	});
}

