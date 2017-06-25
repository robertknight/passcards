/**
 * A Pipe is a proxy for a function which supports cancelation.
 * When a pipe is called, it will pass its arguments to the underlying
 * function, unless it is canceled in which case it will become a no-op.
 *
 * Pipes are useful as a way to cancel promise callbacks by wrapping
 * the fulfilment or rejection handler.
 *
 * eg.
 *   aPipe = pipe(arg => doSomethingWithArg(arg));
 *   aPromise.then(aPipe);
 *   aPipe.cancel(); // "cancel" the promise so that doSomethingWithArg
 *                   // is never called.
 */
export interface Pipe {
    (...args: any[]): void;
    cancel(): void;
}

export default function pipe(fn: Function) {
    let pipeFn: Pipe | Function = (...args: any[]) => {
        fn(...args);
    };
    let pipe = pipeFn as Pipe;
    pipe.cancel = () => {
        fn = () => {};
    };
    return pipe;
}
