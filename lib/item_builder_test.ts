import testLib = require('./test');

import item_builder = require('./item_builder');
import item_store = require('./item_store');

testLib.addTest('adding login updates account', (assert) => {
	var builder = new item_builder.Builder(item_store.ItemTypes.LOGIN);
	var item = builder.addLogin('jim@smith.com').itemAndContent();
	assert.equal(item.item.account, 'jim@smith.com');
});

testLib.addTest('adding URL updates locations', (assert) => {
	var builder = new item_builder.Builder(item_store.ItemTypes.LOGIN);
	var item = builder.addUrl('http://acme.org').itemAndContent();
	assert.equal(item.item.primaryLocation(), 'http://acme.org');
});

