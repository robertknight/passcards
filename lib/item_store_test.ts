import item_store = require('./item_store');
import testLib = require('./test');

testLib.addTest('default item properties', (assert) => {
	var item = new item_store.Item();
	assert.notEqual(item.uuid.match(/^[0-9A-F]{32}$/), null);
	assert.ok(!item.isSaved());
	assert.equal(item.primaryLocation(), '');
});

testLib.addAsyncTest('default item content', (assert) => {
	var item = new item_store.Item();
	return item.getContent().then((content) => {
		assert.equal(content.urls.length, 0);
		assert.equal(content.sections.length, 0);
		assert.equal(content.formFields.length, 0);
	});
});

