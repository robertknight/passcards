import autofill = require('./autofill');
import event_stream = require('../lib/base/event_stream');
import itemBuilder = require('../lib/item_builder');
import onepass = require('../lib/onepass');
import testLib = require('../lib/test');
import pageAccess = require('./page_access');

class FakePageAccess implements pageAccess.PageAccess {
	formList: pageAccess.InputField[];
	autofillEntries: pageAccess.AutoFillEntry[];

	showEvents: event_stream.EventStream<void>;
	pageChanged: event_stream.EventStream<string>;
	currentUrl: string;

	constructor() {
		this.formList = [];
		this.autofillEntries = [];
		this.showEvents = new event_stream.EventStream<void>();
		this.pageChanged = new event_stream.EventStream<string>();
		this.currentUrl = '';
	}

	oauthRedirectUrl() {
		return '';
	}

	findForms(callback: (formList: pageAccess.InputField[]) => void) : void {
		setTimeout(() => {
			callback(this.formList);
		}, 0);
	}

	autofill(fields: pageAccess.AutoFillEntry[]) {
		this.autofillEntries = fields;
	}
}

function itemWithUsernameAndPassword(user: string, password: string) : onepass.Item {
	return new itemBuilder.Builder(onepass.ItemTypes.LOGIN)
	  .setTitle('Test Item')
	  .addLogin(user)
	  .addPassword(password)
	  .addUrl('mysite.com')
	  .item();
}

testLib.addAsyncTest('simple user/password autofill', (assert) => {
	var item = itemWithUsernameAndPassword('testuser@gmail.com', 'testpass');
	var fakePage = new FakePageAccess();

	fakePage.formList.push({
		key: 'f1',
		id: 'username',
		name: 'username',
		type: pageAccess.FieldType.Text
	});

	fakePage.formList.push({
		key: 'f2',
		id: '',
		name: 'password',
		type: pageAccess.FieldType.Password
	});

	var autofiller = new autofill.AutoFiller(fakePage);
	autofiller.autofill(item).then(() => {

		fakePage.autofillEntries.sort((a,b) => {
			return a.key.localeCompare(b.key);
		});

		assert.deepEqual(fakePage.autofillEntries, [
			{ key: 'f1', value: 'testuser@gmail.com' },
			{ key: 'f2', value: 'testpass' }
		]);

		testLib.continueTests();
	}).done();
});

testLib.start();
