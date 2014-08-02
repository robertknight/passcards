/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');

import item_builder = require('./item_builder');
import item_repair = require('./item_repair');
import onepass = require('./onepass');
import testLib = require('./test');

testLib.addAsyncTest('fix location field', (assert) => {
	var builder = new item_builder.Builder(onepass.ItemTypes.LOGIN);
	builder
	  .setTitle('test-item')
	  .addLogin('jimsmith@foobar.com')
	  .addUrl('http://www.testsite.com');
	var item = builder.item();
	var content = builder.content();

	// set Location to incorrect value in item overview
	// data
	item.location = '';

	var reports: string[] = [];

	var repaired = item_repair.repairItem(item, (err) => {
		reports.push(err);
	}, () => {
		// don't save repaired item
		return Q.resolve(false);
	});

	repaired.then(() => {
		assert.equal(item.location, content.urls[0].url);
		assert.ok(reports.length > 0);

		testLib.continueTests();
	}).done();
});

testLib.start();
