/// <reference path="../../typings/DefinitelyTyped/q/Q.d.ts" />

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

/** Run a sequence of async functions in a serial fashion.
  *
  * Returns an array containing the results of each operation.
  */
export function series(funcs: Array<() => Q.Promise<any>>, results?: any[]) : Q.Promise<any[]> {
	results = results || [];
	if (funcs.length == 0) {
		return Q.resolve(results);
	}
	return funcs[0]().then((result) => {
		results.push(result);
		return series(funcs.slice(1), results);
	});
}

/** Async version of a while() loop.
  *
  * Returns a promise which is resolved once the loop is complete.
  *
  * At each iteration, func() is invoked and it returns a promise for
  * completion of the current iteration of the loop. If the promise
  * is resolved with true, the loop exits, otherwise the next iteration
  * begins by invoking func() again.
  */
export function until(func: () => Q.Promise<boolean>) : Q.Promise<boolean> {
	return func().then((done) => {
		if (done) {
			return Q.resolve(true);
		} else {
			return until(func);
		}
	});
}

