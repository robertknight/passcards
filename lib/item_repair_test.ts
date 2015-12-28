
import Q = require('q');

import item_builder = require('./item_builder');
import item_repair = require('./item_repair');
import item_store = require('./item_store');
import testLib = require('./test');

testLib.addAsyncTest('fix location field', (assert) => {
	var builder = new item_builder.Builder(item_store.ItemTypes.LOGIN);
	builder
	.setTitle('test-item')
	.addLogin('jimsmith@foobar.com')
	.addUrl('http://www.testsite.com');
	var item = builder.item();
	var content = builder.content();

	// set Location to incorrect value in item overview
	// data
	item.locations = [];

	var reports: string[] = [];

	var repaired = item_repair.repairItem(item, (err) => {
		reports.push(err);
	}, () => {
			// don't save repaired item
			return Q(false);
		});

	return repaired.then(() => {
		assert.deepEqual(item.locations, [content.urls[0].url]);
		assert.ok(reports.length > 0);
	});
});

