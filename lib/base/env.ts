// env.ts provides functions to query the host Javascript
// environment

/** Returns true if running in the main browser
  * environment with DOM access.
  */
export function isBrowser() {
	return typeof window != 'undefined';
}

/** Returns true if running from within NodeJS
  * (or a compatible environment)
  */
export function isNodeJS() {
	return process && process.version;
}

/** Returns true if running from a Web Worker context
  * in a browser (or a compatible environment)
  */
export function isWebWorker() {
	return typeof importScripts != 'undefined';
}

