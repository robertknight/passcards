import item_search = require('./item_search');
import onepass = require('./onepass');
import testLib = require('./test');

function itemWithTitleAndUrl(title: string, url: string) : onepass.Item {
	var item = new onepass.Item();
	item.title = title;
	item.location = url;
	return item;
}

function formField(name: string, type: onepass.FormFieldType, value: string) : onepass.WebFormField {
	var field = new onepass.WebFormField;
	field.name = name;
	field.type = type;
	field.value = value;

	if (type == onepass.FormFieldType.Password) {
		field.designation = 'password';
	} else if (type == onepass.FormFieldType.Email) {
		field.designation = 'username';
	}

	return field;
}

testLib.addTest('match item', (assert) => {
	var item = itemWithTitleAndUrl('Google', 'google.com');

	var content = new onepass.ItemContent();
	content.formFields.push(formField('login', onepass.FormFieldType.Email, 'jimsmith@gmail.com'));
	content.formFields.push(formField('password', onepass.FormFieldType.Password, 'mypass'));
	content.formFields.push(formField('remember_me', onepass.FormFieldType.Checkbox, 'Y'));
	item.setContent(content);
	
	assert.ok(item_search.matchItem(item, 'goog'));
	assert.ok(item_search.matchItem(item, 'GOOGLE'));

	assert.equal(item_search.matchField(content, 'user').length, 1);
	assert.equal(item_search.matchField(content, 'pass').length, 1);
});

testLib.addTest('URL match score', (assert) => {
	var item = itemWithTitleAndUrl('LWN', 'http://lwn.net');

	// exact matches
	assert.equal(item_search.itemUrlScore(item, 'http://lwn.net'), 1);
	assert.equal(item_search.itemUrlScore(item, 'http://lwn.net/'), 1);

	// same-host matches
	assert.equal(item_search.itemUrlScore(item, 'lwn.net'), 0.8);
	assert.equal(item_search.itemUrlScore(item, 'https://lwn.net'), 0.8);
	assert.equal(item_search.itemUrlScore(item, 'lwn.net/sub/path'), 0.8);

	// top level domain matches
	assert.equal(item_search.itemUrlScore(item, 'subdomain.lwn.net'), 0.5);

	// unrelated domains
	assert.equal(item_search.itemUrlScore(item, 'google.com'), 0);
	
	// invalid URLs
	assert.equal(item_search.itemUrlScore(itemWithTitleAndUrl('Foo', ''), 'about:newtab'), 0);
	assert.equal(item_search.itemUrlScore(itemWithTitleAndUrl('Foo', ''), ''), 0);
});

testLib.addTest('filter items by URL match', (assert) => {
	var googleItem = itemWithTitleAndUrl('Google', 'https://www.google.com');
	var gmailItem = itemWithTitleAndUrl('Google', 'https://mail.google.com');
	var bbcItem = itemWithTitleAndUrl('BBC', 'https://www.bbc.co.uk');

	var items = [bbcItem, gmailItem, googleItem];

	// check that only relevant sites are returned in the match list
	// and that the more specific host match is preferred to the less
	// specific one
	var gmailMatches = item_search.filterItemsByUrl(items, 'mail.google.com/some/login/page');
	assert.deepEqual(gmailMatches, [gmailItem, googleItem]);
});

testLib.start();
