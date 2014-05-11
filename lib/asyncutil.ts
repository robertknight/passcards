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

/** Resolve a promise @p a with @p value when another promise @p b is fulfilled or
  * reject @p a with the error from @p b if @p b fails.
  */
export function resolveWithValue<T, U>(a: Q.Deferred<T>, b: Q.Promise<U>, value: T) : void {
	b.then(() => {
		a.resolve(value);
	})
	.fail((err) => {
		a.reject(err);
	});
}

