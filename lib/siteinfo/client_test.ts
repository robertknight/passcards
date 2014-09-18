/// <reference path="../../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');

import asyncutil = require('../base/asyncutil');
import client = require('./client');
import site_info = require('./site_info');
import testLib = require('../test');

testLib.addAsyncTest('fetch google.com icons', (assert) => {
	var passcardsClient = new client.PasscardsClient();

	var TEST_DOMAIN = 'http://google.com';
	var result: site_info.QueryResult;

	return asyncutil.until(() => {
		result = passcardsClient.lookup(TEST_DOMAIN);
		if (result.state == site_info.QueryState.Ready) {
			return Q(true);
		} else {
			return Q.delay(false, 50);
		}
	}).then(() => {
		assert.equal(result.info.url, 'http://google.com');
		assert.ok(result.info.icons.length > 0);

		result.info.icons.forEach((icon) => {
			assert.ok(icon.width > 0);
			assert.ok(icon.height > 0);
			assert.ok(icon.data !== null);
			assert.ok(icon.url !== null);
		});
	});
});

// set a longer timeout for this test as it involves
// remote calls
testLib.setTimeout(15000);

testLib.start();

