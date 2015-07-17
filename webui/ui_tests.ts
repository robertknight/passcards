// this module is the entry point for UI tests
//
// It sets up a fake DOM environment before loading
// any test modules because React performs various
// tests of the environment when it is first required,
// so the fake DOM needs to be set up first.

import jsdom = require('jsdom');
import Q = require('q');

import testLib = require('../lib/test');

// setup the fake DOM environment for tests.
// This function must be called _before_ React
// is required
function setupDOM(): Q.Promise<Window> {
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

var testModules = [
	'./item_list_view_test',
	'./item_icons_test',
	'./page_test'
];

setupDOM().then(() => {
	testModules.forEach(testModule => {
		try {
			require(testModule);
		} catch (err) {
			console.error('Failed to load test module %s: ', testModule);
			console.error(err.stack);
		}
	});
});
