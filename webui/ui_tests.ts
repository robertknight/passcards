// this module is the entry point for UI tests
//
// It sets up a fake DOM environment before loading
// any test modules because React performs various
// tests of the environment when it is first required,
// so the fake DOM needs to be set up first.

import test_utils = require('./test_utils');
import testLib = require('../lib/test');

var testModules = [
	'./item_list_view_test'
];

test_utils.setupDOM().then(() => {
	testModules.forEach((testModule) => {
		try {
			require(testModule);
		} catch (err) {
			console.error('Failed to load test module %s: ', testModule);
			console.error(err.stack);
		}
	});
});
