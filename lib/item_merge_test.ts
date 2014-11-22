import clone = require('clone');

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

testLib.addTest('merge URL changes', (assert) => {
	var baseItem = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	  .addUrl('signin.acme.org')
	  .itemAndContent();

	var itemA = item_store.cloneItem(baseItem, baseItem.item.uuid);
	var itemB = item_store.cloneItem(baseItem, baseItem.item.uuid);

	itemA.content.urls[0].url = 'acme.org';
	itemA.content.urls.push({
		label: 'acme-login',
		url: 'signin.uses-acme-login.com'
	});
	itemB.content.urls.push({
		label: 'also-uses-acme-login',
		url: 'signin.also-uses-acme-login.com'
	});

	var mergedItem = item_merge.merge(itemA, itemB, baseItem);
	assert.deepEqual(mergedItem.content.urls, [
		{ label: 'website', url: 'acme.org' },
		{ label: 'acme-login', url: 'signin.uses-acme-login.com' },
		{ label: 'also-uses-acme-login', url: 'signin.also-uses-acme-login.com' }
	]);
});

testLib.addTest('merge URL changes with duplicate labels', (assert) => {
	var baseItem = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	  .addUrl('signin.acme.org')
	  .itemAndContent();

	var itemA = item_store.cloneItem(baseItem, baseItem.item.uuid);
	var itemB = item_store.cloneItem(baseItem, baseItem.item.uuid);

	itemA.content.urls.push({
		label: 'website',
		url: 'sso.acme.org'
	});
	itemB.content.urls.push({
		label: 'website',
		url: 'foo.acme.org'
	});

	var mergedItem = item_merge.merge(itemA, itemB, baseItem);
	assert.deepEqual(mergedItem.content.urls, [
		{ label: 'website', url: 'signin.acme.org' },
		{ label: 'website', url: 'sso.acme.org' },
		{ label: 'website', url: 'foo.acme.org' }
	]);
});

testLib.addTest('merge form fields', (assert) => {
	var baseItem = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	  .addUrl('google.com')
	  .itemAndContent();

	var itemA = item_store.cloneItem(baseItem, baseItem.item.uuid);
	var itemB = item_store.cloneItem(baseItem, baseItem.item.uuid);

	itemA.content.formFields.push({
		id:'',
		name: 'username',
		designation: 'username',
		type: item_store.FormFieldType.Text,
		value: 'jimsmith@gmail.com'
	});
	itemB.content.formFields.push({
		id:'',
		name: 'password',
		designation: 'password',
		type: item_store.FormFieldType.Password,
		value: 'secret'
	});

	var mergedItem = item_merge.merge(itemA, itemB, baseItem);
	assert.deepEqual(mergedItem.content.formFields, [{
		id:'',
		name: 'username',
		designation: 'username',
		type: item_store.FormFieldType.Text,
		value: 'jimsmith@gmail.com'
	},{
		id:'',
		name: 'password',
		designation: 'password',
		type: item_store.FormFieldType.Password,
		value: 'secret'
	}]);
});

testLib.addTest('update form fields', (assert) => {
	var baseItem = new item_builder.Builder(item_store.ItemTypes.LOGIN)
	  .addUrl('google.com')
	  .addLogin('jimsmith@gmail.com')
	  .addPassword('secret')
	  .itemAndContent();

	var itemA = item_store.cloneItem(baseItem, baseItem.item.uuid);
	var itemB = item_store.cloneItem(baseItem, baseItem.item.uuid);

	// in the event of a conflict, the local item currently always
	// wins
	itemA.content.formFields[1].value = 'secret2';
	itemB.content.formFields[1].value = 'secret2-conflict';

	var mergedItem = item_merge.merge(itemA, itemB, baseItem);
	assert.deepEqual(mergedItem.content.formFields, [{
		id:'',
		name: 'username',
		designation: 'username',
		type: item_store.FormFieldType.Text,
		value: 'jimsmith@gmail.com'
	},{
		id:'',
		name: 'password',
		designation: 'password',
		type: item_store.FormFieldType.Password,
		value: 'secret2'
	}]);
});

testLib.addTest('merge sections', (assert) => {
	var baseItem = new item_builder.Builder(item_store.ItemTypes.ROUTER)
	  .itemAndContent();

	var sectionA = new item_builder.SectionBuilder('a', 'WiFi')
	  .addField(item_store.FieldType.Text, 'Name', 'Cafe WiFi')
	  .addField(item_store.FieldType.Password, 'Password', 'secret')
	  .section();
	baseItem.content.sections.push(sectionA);

	var itemA = item_store.cloneItem(baseItem, baseItem.item.uuid);
	var itemB = item_store.cloneItem(baseItem, baseItem.item.uuid);

	var updatedSectionA = <item_store.ItemSection>clone(sectionA);
	updatedSectionA.fields[1].value = 'updated-secret';

	itemA.content.sections[0] = updatedSectionA;

	var sectionB = new item_builder.SectionBuilder('b', 'Admin')
	  .addField(item_store.FieldType.Password, 'Admin Password', 'secret3')
	  .section();
	itemB.content.sections.push(sectionB);

	var mergedItem = item_merge.merge(itemA, itemB, baseItem);
	assert.equal(mergedItem.content.sections.length, 2);

	var expectedSectionA = {
		fields: [{
			kind: item_store.FieldType.Text,
			title: 'Name',
			value: 'Cafe Wifi'
		},{
			kind: item_store.FieldType.Password,
			title: 'Password',
			value: 'secret'
		}],
		title: 'WiFi',
		name: 'a'
	};
	assert.deepEqual(testLib.compareObjects(mergedItem.content.sections[0],
	  expectedSectionA), []);

	var expectedSectionB = {
		fields: [{
			kind: item_store.FieldType.Password,
			title: 'Admin Password',
			value: 'secret3'
		}],
		title: 'Admin',
		name: 'b'
	};
	assert.deepEqual(testLib.compareObjects(mergedItem.content.sections[1],
	  expectedSectionB), []);
});

