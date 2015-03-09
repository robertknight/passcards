import ui_item_store = require('./items');
import item_builder = require('../../lib/item_builder');
import item_store = require('../../lib/item_store');
import testLib = require('../../lib/test');

testLib.addTest('changing current URL resets selected item', (assert) => {
	var item = new item_builder.Builder(item_store.ItemTypes.LOGIN).item();
	var uiItemStore = new ui_item_store.Store();
	uiItemStore.update({ selectedItem: item });
	assert.equal(uiItemStore.state.selectedItem, item);
	uiItemStore.update({ currentUrl: 'http://www.google.com' });
	assert.equal(uiItemStore.state.selectedItem, null);
});

