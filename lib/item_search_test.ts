import item_search = require('./item_search');
import onepass = require('./onepass');
import testLib = require('./test');

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
	var item = new onepass.Item();
	item.title = 'Google';
	item.location = 'google.com';

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

testLib.start();
