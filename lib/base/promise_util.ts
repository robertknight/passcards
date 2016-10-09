import * as Q from 'q';

export interface Deferred<T> {
	resolve: (result: T) => void;
	reject: (err: any) => void;
	promise: Q.Promise<T>;
}

/**
 * Utility to aid in porting uses of `Q.defer()` to native promises.
 */
export function defer<T>(): Deferred<T> {
	let resolve: (result: T) => void;
	let reject: (err: any) => void;
	let promise = Q.Promise<T>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	return {
		promise,
		resolve,
		reject,
	};
}
