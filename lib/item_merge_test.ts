import item_builder = require('./item_builder');
import item_merge = require('./item_merge');
import item_store = require('./item_store');
import testLib = require('./test');

testLib.addTest('merge field changes', (assert) => {
	var baseItem = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	  .setTitle('new item')
	  .addLogin('jim.smith@gmail.com')
	  .itemAndContent();

	var itemA = item_store.cloneItem(baseItem, baseItem.item.uuid);
	var itemB = item_store.cloneItem(baseItem, baseItem.item.uuid);

	itemA.item.title = 'Updated Title';
	itemB.item.trashed = true;

	var mergedItem = item_merge.merge(itemA, itemB, baseItem);
	assert.equal(mergedItem.item.title, itemA.item.title);
	assert.equal(mergedItem.item.trashed, itemB.item.trashed);
});
