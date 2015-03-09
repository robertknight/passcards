/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import Q = require('q');
import underscore = require('underscore');

import asyncutil = require('./base/asyncutil');
import crypto = require('./onepass_crypto');
import env = require('./base/env');
import exportLib = require('./export');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import nodefs = require('./vfs/node');
import agile_keychain = require('./agile_keychain');
import testLib = require('./test');
import vfs = require('./vfs/vfs');
import vfs_util = require('./vfs/util');

require('es6-shim');

class TestCase {
	/** Relative path to the vault within the test data dir */
	path: string;

	/** Master password for the test vault. */
	password: string;

	/** Path to .1pif file containing expected
	  * decrypted data.
	  */
	itemDataPath: string;
}

var TEST_VAULTS: TestCase[] = [
	{
		path: 'test.agilekeychain',
		password: 'logMEin',
		itemDataPath: 'test.1pif'
	}
];

var fs = new nodefs.FileVFS('lib/test-data');

class ItemAndContent {
	item: item_store.Item;
	content: item_store.ItemContent;
}

function createTestVault(): Q.Promise<agile_keychain.Vault> {
	var vault = Q.defer<agile_keychain.Vault>();
	var fs = new nodefs.FileVFS('lib/test-data');
	vfs_util.rmrf(fs, 'copy.agilekeychain').then(() => {
		return fs.stat('test.agilekeychain')
	}).then((srcFolder) => {
		return vfs_util.cp(fs, srcFolder, 'copy.agilekeychain')
	}).then(() => {
		var newVault = new agile_keychain.Vault(fs, 'copy.agilekeychain');
		newVault.unlock('logMEin').then(() => {
			vault.resolve(newVault);
		}).done();
	})
	.done();
	return vault.promise;
}

testLib.addAsyncTest('Import item from .1pif file', (assert) => {
	var importer = new exportLib.PIFImporter();
	var actualItems = importer.importItems(fs, 'test.1pif');
	actualItems.then((items) => {
		assert.equal(items.length, 1, 'Imported expected number of items');
		var expectedItem = agile_keychain.fromAgileKeychainItem(null, {
			"vault": null,
			"updatedAt": 1398413120,
			"title": "Facebook",
			"securityLevel": "SL5",
			"secureContents": {
				"sections": [],
				"URLs": [
					{
						"label": "website",
						"url": "facebook.com"
					}
				],
				"notesPlain": "",
				"fields": [
					{
						"value": "john.doe@gmail.com",
						"id": "",
						"name": "username",
						"type": "T",
						"designation": "username"
					},
					{
						"value": "Wwk-ZWc-T9MO",
						"id": "",
						"name": "password",
						"type": "P",
						"designation": "password"
					}
				],
				"htmlMethod": "",
				"htmlAction": "",
				"htmlID": ""
			},
			"typeName": "webforms.WebForm",
			"uuid": "CA20BB325873446966ED1F4E641B5A36",
			"createdAt": 1398413120,
			"location": "facebook.com",
			"folderUuid": "",
			"faveIndex": 0,
			"trashed": false,
			"openContents": {
				"tags": null,
				"scope": ""
			}
		});
		var diff = testLib.compareObjects(items[0], expectedItem);
		assert.equal(diff.length, 0, 'Actual/expected imported items match');

		testLib.continueTests();
	}).done();
});

// set of tests which open a vault, unlock it,
// fetch all items and compare to an expected set
// of items in .1pif format
testLib.addAsyncTest('Compare vaults against .1pif files', (assert) => {
	var done: Q.Promise<boolean>[] = [];
	var importer = new exportLib.PIFImporter();

	TEST_VAULTS.forEach((tst) => {
		var result = Q.defer<boolean>();
		done.push(result.promise);

		var expectedItems = importer.importItems(fs, tst.itemDataPath);
		var actualItems = Q.defer<ItemAndContent[]>();

		var vault = new agile_keychain.Vault(fs, tst.path);
		var items: item_store.Item[];
		vault.unlock(tst.password).then(() => {
			return vault.listItems();
		}).then((_items) => {
			items = _items;
			var contents: Q.Promise<item_store.ItemContent>[] = [];
			items.forEach((item) => {
				contents.push(item.getContent());
			});
			return Q.all(contents);
		}).then((contents) => {
			var itemContents: ItemAndContent[] = [];
			items.forEach((item, index) => {
				itemContents.push({ item: item, content: contents[index] });
			});
			actualItems.resolve(itemContents);
		}).done();

		Q.all([expectedItems, actualItems.promise]).then((expectedActual) => {
			var expectedAry = <item_store.Item[]> expectedActual[0];
			var actualAry = <ItemAndContent[]> expectedActual[1];

			expectedAry.sort((itemA, itemB) => {
				return itemA.uuid.localeCompare(itemB.uuid);
			});
			actualAry.sort((itemA, itemB) => {
				return itemA.item.uuid.localeCompare(itemB.item.uuid);
			});

			assert.equal(expectedAry.length, actualAry.length,
				'actual and expected vault item counts match');

			for (var i = 0; i < expectedAry.length; i++) {
				var expectedItem = expectedAry[i];
				var actualItem = actualAry[i].item;
				actualItem.setContent(actualAry[i].content);

				var diff = testLib.compareObjects(expectedItem, actualItem,
					['root/store', 'root/encrypted'],
					['root/securityLevel', 'root/createdAt', 'root/faveIndex', 'root/openContents']
					);
				if (diff.length > 0) {
					console.log(diff);
				}
				assert.equal(diff.length, 0, 'actual and expected item contents match');
			}

			result.resolve(true);
		}).done();
	});

	return Q.all(done);
});

function createCryptos(): crypto.Crypto[] {
	var cryptoImpls: crypto.Crypto[] = [];
	cryptoImpls.push(new crypto.CryptoJsCrypto);
	if (env.isNodeJS()) {
		cryptoImpls.push(new crypto.NodeCrypto);
	}
	return cryptoImpls;
}

testLib.addTest('AES encrypt/decrypt', (assert) => {
	var cryptoImpls = createCryptos();
	cryptoImpls.forEach((impl) => {
		var plainText = 'foo bar';
		var key = 'ABCDABCDABCDABCD';
		var iv = 'EFGHEFGHEFGHEFGH';

		var cipherText = impl.aesCbcEncrypt(key, plainText, iv);
		var decrypted = impl.aesCbcDecrypt(key, cipherText, iv);

		assert.equal(decrypted, plainText);
	});
});

testLib.addTest('Encrypt/decrypt item data', (assert) => {
	var cryptoImpls = createCryptos();
	cryptoImpls.forEach((impl) => {
		var itemData = JSON.stringify({ secret: 'secret-data' });
		var itemPass = 'item password';
		var encrypted = crypto.encryptAgileKeychainItemData(impl, itemPass, itemData);
		var decrypted = crypto.decryptAgileKeychainItemData(impl, itemPass, encrypted);
		assert.equal(decrypted, itemData);
	});
});

testLib.addTest('New item UUID', (assert) => {
	var item = new item_store.Item();
	assert.ok(item.uuid.match(/[0-9A-F]{32}/) != null);
});

testLib.addAsyncTest('Save item', (assert) => {
	createTestVault().then((vault) => {
		var item = new item_store.Item(vault);
		item.title = 'New Test Item';
		item.locations.push('mysite.com');
		var content = new item_store.ItemContent();
		content.urls.push({
			url: 'mysite.com',
			label: 'website'
		});
		item.setContent(content);
		item.save().then(() => {
			return vault.loadItem(item.uuid);
		}).then((loadedItem) => {
			// check overview data matches
			assert.equal(item.title, loadedItem.title);

			// check item content matches
			loadedItem.getContent().then((loadedContent) => {
				testLib.assertEqual(assert, content, loadedContent);

				// check new item appears in vault list
				vault.listItems().then((items) => {
					// check that selected properties match
					var comparedProps: any[] = ['title',
						'uuid', 'trashed', 'faveIndex', 'typeName',
						'location', 'updatedAt'];

					var actualOverview = underscore.find(items, (item) => { return item.uuid == loadedItem.uuid });
					testLib.assertEqual(assert, actualOverview, item, comparedProps);
					testLib.continueTests();
				}).done();
			}).done();
		})
		.done();
	})
	.done();
});

testLib.addAsyncTest('Update item', (assert) => {
	createTestVault().then((vault) => {
		var item = new item_store.Item(vault);
		item.title = 'Original item title';

		var content = new item_store.ItemContent();
		content.formFields.push({
			id: '',
			name: 'password',
			type: item_store.FormFieldType.Password,
			designation: 'password',
			value: 'original-password'
		});
		content.urls.push({
			label: 'website',
			url: 'mysite.com'
		});
		item.setContent(content);

		// get a date a couple of seconds in the past.
		// After saving we'll check that the item's save date
		// was updated to the current time.
		//
		// Note that item save dates are rounded down to the nearest
		// second on save.
		var originalSaveDate = new Date(Date.now() - 2000);

		var loadedItem: item_store.Item;
		item.save().then(() => {
			return vault.loadItem(item.uuid);
		}).then((loadedItem_) => {
			loadedItem = loadedItem_;
			return loadedItem.getContent()
		}).then((content) => {
			var passwordField = underscore.find(content.formFields, (field) => {
				return field.name == 'password';
			});
			assert.notEqual(passwordField, null);
			assert.equal(passwordField.value, 'original-password');
			assert.equal(passwordField.type, item_store.FormFieldType.Password);
			assert.equal(content.password(), 'original-password');

			loadedItem.title = 'New Item Title';
			loadedItem.faveIndex = 42;
			content.urls[0].url = 'newsite.com';
			loadedItem.trashed = true;

			passwordField.value = 'new-password';
			loadedItem.setContent(content);

			return loadedItem.save();
		}).then(() => {
			return vault.loadItem(item.uuid);
		}).then((loadedItem_) => {
			loadedItem = loadedItem_;

			assert.equal(loadedItem.title, 'New Item Title');
			assert.equal(loadedItem.faveIndex, 42);
			assert.equal(loadedItem.trashed, true);

			// check that Item.location property is updated
			// to match URL list on save
			assert.deepEqual(loadedItem.locations, ['newsite.com']);

			// check that Item.updatedAt is updated on save
			assert.ok(loadedItem.updatedAt > originalSaveDate);

			return loadedItem.getContent();
		}).then((content) => {
			var passwordField = underscore.find(content.formFields, (field) => {
				return field.name == 'password';
			});
			assert.notEqual(passwordField, null);
			assert.equal(passwordField.value, 'new-password');
			assert.equal(content.password(), 'new-password');

			testLib.continueTests();
		})
		.done();
	})
	.done();
});

testLib.addAsyncTest('Remove item', (assert) => {
	createTestVault().then((vault) => {
		var item: item_store.Item;
		vault.loadItem('CA20BB325873446966ED1F4E641B5A36').then((item_) => {
			item = item_;
			assert.equal(item.title, 'Facebook');
			assert.equal(item.typeName, item_store.ItemTypes.LOGIN);
			assert.ok(item.isRegularItem());
			return item.getContent();
		}).then((content) => {
			testLib.assertEqual(assert, content.urls, [{ label: 'website', 'url': 'facebook.com' }]);
			var passwordField = underscore.find(content.formFields, (field) => {
				return field.designation == 'password';
			});
			assert.ok(passwordField != null);
			assert.equal(passwordField.value, 'Wwk-ZWc-T9MO');
			return item.remove();
		}).then(() => {
			// check that all item-specific data has been erased.
			// Only a tombstone should be left behind
			assert.ok(item.isTombstone());
			assert.ok(!item.isRegularItem());
			assert.equal(item.title, 'Unnamed');
			assert.equal(item.typeName, item_store.ItemTypes.TOMBSTONE);
			return vault.loadItem(item.uuid);
		}).then((loadedItem) => {
			assert.ok(loadedItem.isTombstone());
			assert.equal(loadedItem.title, 'Unnamed');
			assert.equal(loadedItem.typeName, item_store.ItemTypes.TOMBSTONE);
			assert.equal(loadedItem.trashed, true);
			assert.equal(loadedItem.faveIndex, null);
			assert.equal(loadedItem.openContents, null);

			return loadedItem.getContent();
		}).then((content) => {
			testLib.assertEqual(assert, content, new item_store.ItemContent());
			testLib.continueTests();
		}).done();
	});
});

testLib.addTest('Generate Passwords', (assert) => {
	var usedPasswords = new Set<string>();
	for (var len = 4; len < 20; len++) {
		for (var k = 0; k < 10; k++) {
			var pass = crypto.generatePassword(len);
			assert.ok(pass.match(/[A-Z]/) != null);
			assert.ok(pass.match(/[a-z]/) != null);
			assert.ok(pass.match(/[0-9]/) != null);
			assert.equal(pass.length, len);

			assert.ok(!usedPasswords.has(pass));
			usedPasswords.add(pass);
		}
	}
});

testLib.addTest('Encrypt/decrypt key (sync)', (assert) => {
	var password = 'test-pass'
	var iterations = 100;
	var salt = crypto.randomBytes(8);
	var masterKey = crypto.randomBytes(1024);

	var derivedKey = key_agent.keyFromPasswordSync(password, salt, iterations);
	var encryptedKey = key_agent.encryptKey(derivedKey, masterKey);
	var decryptedKey = key_agent.decryptKey(derivedKey, encryptedKey.key, encryptedKey.validation);
	assert.equal(decryptedKey, masterKey);
	assert.throws(() => {
		var derivedKey2 = key_agent.keyFromPasswordSync('wrong-pass', salt, iterations);
		key_agent.decryptKey(derivedKey2, encryptedKey.key, encryptedKey.validation)
	});
});

testLib.addAsyncTest('Encrypt/decrypt key (async)', (assert) => {
	var password = ' test-pass-2';
	var iterations = 100;
	var salt = crypto.randomBytes(8);
	var masterKey = crypto.randomBytes(1024);

	return key_agent.keyFromPassword(password, salt, iterations).then((derivedKey) => {
		var encryptedKey = key_agent.encryptKey(derivedKey, masterKey);
		var decryptedKey = key_agent.decryptKey(derivedKey, encryptedKey.key, encryptedKey.validation);
		assert.equal(decryptedKey, masterKey);
	});
});

testLib.addAsyncTest('Create new vault', (assert) => {
	var fs = new nodefs.FileVFS('/tmp');
	var pass = 'test-new-vault-pass';
	var hint = 'the-password-hint';
	var vault: agile_keychain.Vault;
	var keyIterations = 100;
	var vaultDir = '/new-vault';

	return vfs_util.rmrf(fs, vaultDir + '.agilekeychain').then(() => {
		return agile_keychain.Vault.createVault(fs, vaultDir, pass, hint, keyIterations)
	}).then((vault_) => {
		vault = vault_;
		return vault.unlock(pass)
	}).then(() => {
		return vault.listItems()
	}).then((items) => {
		assert.equal(items.length, 0);

		var item = new item_store.Item(vault);
		item.title = 'Item in new vault';

		var content = new item_store.ItemContent();
		content.urls.push({
			url: 'foobar.com',
			label: 'website'
		});

		item.setContent(content);
		return item.save();
	}).then(() => {
		return vault.listItems()
	}).then((items) => {
		assert.equal(items.length, 1);
		return items[0].getContent();
	}).then((content) => {
		assert.equal(content.urls.length, 1);
		assert.equal(content.urls[0].url, 'foobar.com');
		return vault.passwordHint();
	}).then((savedHint) => {
		assert.equal(savedHint, hint);
	});
});

testLib.addAsyncTest('Change vault password', (assert) => {
	var vault: agile_keychain.Vault;
	createTestVault().then((vault_) => {
		vault = vault_;
		return vault.changePassword('wrong-pass', 'new-pass', 'new-hint');
	}).catch((err) => {
		assert.ok(err instanceof key_agent.DecryptionError);
		vault.changePassword('logMEin', 'new-pass', 'new-hint')
		.then(() => {
			return vault.unlock('new-pass');
		}).then(() => {
			return vault.passwordHint();
		}).then((hint) => {
			assert.equal(hint, 'new-hint');
			testLib.continueTests();
		}).done();
	});
});

testLib.addAsyncTest('Save existing item to new vault', (assert) => {
	var vault: agile_keychain.Vault;
	var item: item_store.Item;

	return createTestVault().then((vault_) => {
		vault = vault_;
		item = new item_store.Item();
		item.title = 'Existing Item';
		item.locations.push('somesite.com');
		item.setContent(new item_store.ItemContent());
		return item.saveTo(vault);
	}).then(() => {
		assert.equal(item.uuid.length, 32);
		return vault.loadItem(item.uuid);
	}).then((loadedItem) => {
		assert.equal(item.title, loadedItem.title);
	});
});

testLib.addTest('Item content account and password accessors', (assert) => {
	var content = new item_store.ItemContent();
	content.formFields.push({
		id: '',
		name: 'password',
		type: item_store.FormFieldType.Password,
		designation: 'password',
		value: 'the-item-password'
	}, {
			id: '',
			name: 'email',
			type: item_store.FormFieldType.Text,
			designation: 'username',
			value: 'jim.smith@gmail.com'
		});
	assert.equal(content.account(), 'jim.smith@gmail.com');
	assert.equal(content.password(), 'the-item-password');
});

testLib.addTest('Item field value formatting', (assert) => {
	var dateField = agile_keychain.fromAgileKeychainField({
		k: 'date',
		n: 'dob',
		t: 'Date of Birth',
		v: 567278822
	});
	assert.ok(dateField.valueString().match(/Dec 23 1987/) != null);

	var monthYearField = agile_keychain.fromAgileKeychainField({
		k: 'monthYear',
		n: 'expdate',
		t: 'Expiry Date',
		v: 201405
	});
	assert.equal(monthYearField.valueString(), '05/14');
});

testLib.addTest('Default item properties', (assert) => {
	var item = new item_store.Item();
	assert.deepEqual(item.locations, []);
	assert.strictEqual(item.trashed, false);
	assert.equal(item.uuid.length, 32);

	// check that new items get different IDs
	var item2 = new item_store.Item();
	assert.notEqual(item.uuid, item2.uuid);
});

testLib.addTest('createVault() fails if directory exists', (assert) => {
	var fs = new nodefs.FileVFS('/tmp');
	var pass = 'pass-1';
	var hint = 'test-new-vault-hint';
	var keyIterations = 100;
	var path = '/new-vault-twice.agilekeychain';

	var vault: agile_keychain.Vault;
	return vfs_util.rmrf(fs, path).then(() => {
		return agile_keychain.Vault.createVault(fs, path, pass, hint, keyIterations);
	}).then((vault_) => {
		vault = vault_;
		var newPass = 'pass-2';
		return asyncutil.result(agile_keychain.Vault.createVault(fs, path, pass, hint, keyIterations));
	}).then((result) => {
		assert.ok(result.error instanceof Error);

		// check that the original vault has not been modified
		return vault.unlock(pass);
	});
});

