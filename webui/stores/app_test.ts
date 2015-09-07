import app_state = require('./app');
import item_builder = require('../../lib/item_builder');
import item_store = require('../../lib/item_store');
import testLib = require('../../lib/test');

testLib.addTest('changing current URL resets selected item', (assert) => {
	var item = new item_builder.Builder(item_store.ItemTypes.LOGIN).item();
	var appStateStore = new app_state.Store();
	appStateStore.update({ selectedItem: item });
	assert.equal(appStateStore.state.selectedItem, item);
	appStateStore.update({ currentUrl: 'http://www.google.com' });
	assert.equal(appStateStore.state.selectedItem, null);
});
