/// <reference path="../../typings/DefinitelyTyped/node/node.d.ts" />

// env.ts provides functions to query the host Javascript
// environment

// This module has no dependencies to facilitate easier re-use across
// different JS environments

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

/** Returns true if running as a page script
  * in a Firefox Jetpack add-on
  */
export function isFirefoxAddon() {
	return isBrowser() && window.location.protocol == 'resource:';
}

/** Returns true if running as a content or
  * background script in a Google Chrome extension
  */
export function isChromeExtension() {
	return isBrowser() && typeof chrome != 'undefined';
}

