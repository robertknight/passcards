export interface Deferred<T> {
    resolve: (result: T) => void;
    reject: (err: any) => void;
    promise: Promise<T>;
}

/**
 * Utility to aid in porting uses of `Q.defer()` to native promises.
 */
export function defer<T>(): Deferred<T> {
    let resolve: (result: T) => void;
    let reject: (err: any) => void;

    // Work around babel-minify issue where `resolve`, `reject` declarations are
    // moved after `promise` declaration and therefore not visible when the
    // Promise constructor runs leading to a TDZ error.
    resolve = null;
    reject = null;

    let promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });

    return {
        promise,
        resolve,
        reject,
    };
}

/**
 * Return a Node-style callback function which resolves or rejects a promise.
 */
export function nodeResolver<T>(d: Deferred<T>): (err: any, result: T) => void {
    return (err, result) => (err ? d.reject(err) : d.resolve(result));
}

/**
 * Return a Promise which resolves with `value` after `ms` milliseconds.
 */
export function delay<T>(value: T, ms: number) {
    return new Promise<T>(resolve => setTimeout(() => resolve(value), ms));
}
