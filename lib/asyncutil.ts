/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');

/** Resolve or reject promise @p a with the result of promise @p b.
  * Returns the promise associated with @p a
  */
export function resolveWith<T>(a: Q.Deferred<T>, b: Q.Promise<T>) : Q.Promise<T> {
	b.then((result) => {
		a.resolve(result);
	})
	.fail((err) => {
		a.reject(err);
	});
	return a.promise;
}

/** Resolve a promise @p a with @p value when another promise @p b is fulfilled or
  * reject @p a with the error from @p b if @p b fails.
  *
  * Returns the promise associated with @p a
  */
export function resolveWithValue<T, U>(a: Q.Deferred<T>, b: Q.Promise<U>, value: T) : Q.Promise<T> {
	b.then(() => {
		a.resolve(value);
	})
	.fail((err) => {
		a.reject(err);
	});
	return a.promise;
}

/** Returns a promise with the result type erased.
  *
  * Note: This doesn't actually modify the passed promise at all,
  * it just exists as a helper for type checking.
  */
export function eraseResult<T>(p: Q.Promise<T>) : Q.Promise<void> {
	return <any>p;
}

