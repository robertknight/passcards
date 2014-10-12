/// <reference path="../../typings/DefinitelyTyped/chrome/chrome.d.ts" />
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
	return isBrowser() &&
	       typeof chrome !== 'undefined' &&
	       typeof chrome.extension !== 'undefined';
}

/** Returns true if (probably) running on a touch-screen device.
  *
  * See http://ctrlq.org/code/19616-detect-touch-screen-javascript
  */
export function isTouchDevice() {
	if (!isBrowser()) {
		return false;
	}

	return ('ontouchstart' in window) ||
	       (navigator.maxTouchPoints > 0) ||
	       (navigator.msMaxTouchPoints > 0);
}

