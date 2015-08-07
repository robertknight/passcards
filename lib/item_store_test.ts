import item_builder = require('./item_builder');
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

// test that revision IDs generated for items change
// when core metadata fields and content changes
testLib.addTest('item revision ID', (assert) => {
	var item = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	.setTitle('Facebook')
	.addLogin('jim.smith@gmail.com')
	.addPassword('secret')
	.itemAndContent();
	var revA = item_store.generateRevisionId(item);

	item_store.ContentUtil.passwordField(item.content).value = 'secret2';
	var revB = item_store.generateRevisionId(item);

	assert.notEqual(revA, revB);
	item.item.title = 'Facebook (2)';
	var revC = item_store.generateRevisionId(item);
	assert.notEqual(revB, revC);

	item.item.updatedAt = new Date();
	var revD = item_store.generateRevisionId(item);
	assert.notEqual(revC, revD);
});
