
import Q = require('q');

import autofill = require('./autofill');
import event_stream = require('../lib/base/event_stream');
import forms = require('./forms');
import item_builder = require('../lib/item_builder');
import item_store = require('../lib/item_store');
import browser_access = require('./browser_access');
import site_info = require('../lib/siteinfo/site_info');
import testLib = require('../lib/test');
import { defer } from '../lib/base/promise_util';

class FakeBrowserAccess implements browser_access.BrowserAccess {
	formList: forms.FieldGroup[];
	autofillEntries: forms.AutoFillEntry[];

	events: event_stream.EventStream<browser_access.BrowserMessage>;
	currentUrl: string;

	constructor() {
		this.formList = [];
		this.autofillEntries = [];
		this.events = new event_stream.EventStream<browser_access.BrowserMessage>();
		this.currentUrl = '';
	}

	oauthRedirectUrl() {
		return '';
	}

	findForms() {
		let result = defer<forms.FieldGroup[]>();
		setTimeout(() => {
			result.resolve(this.formList);
		});
		return result.promise;
	}

	autofill(fields: forms.AutoFillEntry[]): Q.Promise<number> {
		this.autofillEntries = fields;
		return Q(fields.length);
	}

	siteInfoProvider(): site_info.SiteInfoProvider {
		return null;
	}

	hidePanel(): void {
		/* no-op */
	}
}

function itemWithUsernameAndPassword(user: string, password: string): item_store.Item {
	return new item_builder.Builder(item_store.ItemTypes.LOGIN)
	.setTitle('Test Item')
	.addLogin(user)
	.addPassword(password)
	.addUrl('mysite.com')
	.item();
}

testLib.addAsyncTest('simple user/password autofill', (assert) => {
	var item = itemWithUsernameAndPassword('testuser@gmail.com', 'testpass');
	var fakePage = new FakeBrowserAccess();

	var form = {
		fields: [{
			key: 'f1',
			id: 'username',
			name: 'username',
			type: forms.FieldType.Text,
			visible: true
		}, {
				key: 'f2',
				id: '',
				name: 'password',
				type: forms.FieldType.Password,
				visible: true
			}]
	};
	fakePage.formList.push(form);

	var autofiller = new autofill.AutoFiller(fakePage);
	return autofiller.autofill(item).then((result) => {
		assert.equal(result.count, 2);

		fakePage.autofillEntries.sort((a, b) => {
			return a.key.localeCompare(b.key);
		});

		assert.deepEqual(fakePage.autofillEntries, [
			{ key: 'f1', value: 'testuser@gmail.com' },
			{ key: 'f2', value: 'testpass' }
		]);
	});
});

testLib.addAsyncTest('ignore hidden fields', (assert) => {
	var item = itemWithUsernameAndPassword('testuser@gmail.com', 'testpass');
	var fakePage = new FakeBrowserAccess();

	var form = {
		fields: [{
			key: 'f1',
			type: forms.FieldType.Password,
			visible: true
		}, {
				key: 'f2',
				type: forms.FieldType.Password,
				visible: false
			}]
	};
	fakePage.formList.push(form);

	var autofiller = new autofill.AutoFiller(fakePage);
	return autofiller.autofill(item).then((result) => {
		assert.equal(result.count, 1);
		assert.deepEqual(fakePage.autofillEntries, [
			{ key: 'f1', value: 'testpass' }
		]);
	});
});

testLib.addAsyncTest('find unlabeled username fields', (assert) => {
	var item = itemWithUsernameAndPassword('testuser@gmail.com', 'testpass');
	var fakePage = new FakeBrowserAccess();

	var form = {
		fields: [{
			key: 'f1',
			type: forms.FieldType.Text,
			visible: true
		}, {
				key: 'f2',
				type: forms.FieldType.Password,
				visible: true
			}]
	};
	fakePage.formList.push(form);

	var autofiller = new autofill.AutoFiller(fakePage);
	return autofiller.autofill(item).then((result) => {
		assert.equal(result.count, 2);
		assert.deepEqual(fakePage.autofillEntries, [
			{ key: 'f2', value: 'testpass' },
			{ key: 'f1', value: 'testuser@gmail.com' }
		]);
	});
});

testLib.start();
