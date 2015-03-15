/// <reference path="../typings/DefinitelyTyped/jsdom/jsdom.d.ts" />

import jsdom = require('jsdom');
import Q = require('q');

export function setupDOM(): Q.Promise<Window> {
	if (typeof window !== 'undefined') {
		return Q(window);
	}

	var fakeWindow = Q.defer<Window>();
	jsdom.env({
		url: 'https://robertknight.github.io/passcards',
		html: '<div id="app"></div>',
		done: (errors, window) => {
			if (errors) {
				console.log('errors', errors);
			}

			// expose document and window on app globals
			// for use by tests
			global.window = window;
			global.document = window.document;
			global.navigator = window.navigator;

			fakeWindow.resolve(window);
		}
	});
	return fakeWindow.promise;
}

