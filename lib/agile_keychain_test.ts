/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import Q = require('q');
import path = require('path');
import underscore = require('underscore');

import agile_keychain = require('./agile_keychain');
import agile_keychain_crypto = require('./agile_keychain_crypto');
import asyncutil = require('./base/asyncutil');
import crypto = require('./base/crypto');
import env = require('./base/env');
import exportLib = require('./export');
import item_builder = require('./item_builder');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import nodefs = require('./vfs/node');
import password_gen = require('./password_gen');
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

function createEmptyVault() {
	const VAULT_PASS = 'logMEin';
	const VAULT_PASS_ITER = 100;

	let fs = new nodefs.FileVFS('/');
	let vault: agile_keychain.Vault;

	return vfs_util.mktemp(fs, '/tmp', 'vault.XXX').then(path => {
		return agile_keychain.Vault.createVault(fs, path, VAULT_PASS, '', VAULT_PASS_ITER);
	}).then(vault_ => {
		vault = vault_;
		return vault_.unlock(VAULT_PASS);
	}).then(() => vault);
}

function createTestVault() {
	let sourcePath = path.resolve('lib/test-data');
	let copyPath = '/tmp/copy.agilekeychain';

	let vault: agile_keychain.Vault;
	let fs = new nodefs.FileVFS('/');
	return vfs_util.rmrf(fs, copyPath).then(() => {
		return fs.stat(sourcePath + '/test.agilekeychain')
	}).then(srcFolder => {
		return vfs_util.cp(fs, srcFolder, copyPath)
	}).then(() => {
		var newVault = new agile_keychain.Vault(fs, copyPath);
		vault = newVault;
		return newVault.unlock('logMEin');
	}).then(() => {
		return vault;
	});
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
					['root/store', 'root/encrypted', 'root/revision'],
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

function createCryptos(): agile_keychain_crypto.Crypto[] {
	var cryptoImpls: agile_keychain_crypto.Crypto[] = [];
	cryptoImpls.push(new agile_keychain_crypto.CryptoJsCrypto);
	if (env.isNodeJS()) {
		cryptoImpls.push(new agile_keychain_crypto.NodeCrypto);
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
		var encrypted = agile_keychain_crypto.encryptAgileKeychainItemData(impl, itemPass, itemData);
		var decrypted = agile_keychain_crypto.decryptAgileKeychainItemData(impl, itemPass, encrypted);
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
			assert.equal(item.title, loadedItem.item.title);

			// check item content matches
			testLib.assertEqual(assert, content, loadedItem.content);

			// check new item appears in vault list
			vault.listItems().then(items => {
				// check that selected properties match
				var comparedProps: any[] = ['title',
					'uuid', 'trashed', 'typeName',
					'location', 'updatedAt'];

				var actualOverview = underscore.find(items, item => item.uuid == loadedItem.item.uuid);
				testLib.assertEqual(assert, actualOverview, loadedItem.item, comparedProps);
				testLib.continueTests();
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

		var loadedItem: item_store.ItemAndContent;
		item.save().then(() => {
			return vault.loadItem(item.uuid);
		}).then((loadedItem_) => {
			loadedItem = loadedItem_;
			var passwordField = underscore.find(loadedItem.content.formFields, (field) => {
				return field.name == 'password';
			});
			assert.notEqual(passwordField, null);
			assert.equal(passwordField.value, 'original-password');
			assert.equal(passwordField.type, item_store.FormFieldType.Password);
			assert.equal(content.password(), 'original-password');

			loadedItem.item.title = 'New Item Title';
			loadedItem.item.faveIndex = 42;
			loadedItem.content.urls[0].url = 'newsite.com';
			loadedItem.item.trashed = true;

			passwordField.value = 'new-password';
			loadedItem.item.setContent(loadedItem.content);

			return loadedItem.item.save();
		}).then(() => {
			return vault.loadItem(item.uuid);
		}).then((loadedItem_) => {
			loadedItem = loadedItem_;

			assert.equal(loadedItem.item.title, 'New Item Title');
			assert.equal(loadedItem.item.faveIndex, 42);
			assert.equal(loadedItem.item.trashed, true);

			// check that Item.location property is updated
			// to match URL list on save
			assert.deepEqual(loadedItem.item.locations, ['newsite.com']);

			// check that Item.updatedAt is updated on save
			assert.ok(loadedItem.item.updatedAt > originalSaveDate);

			var passwordField = underscore.find(loadedItem.content.formFields, (field) => {
				return field.name == 'password';
			});
			assert.notEqual(passwordField, null);
			assert.equal(passwordField.value, 'new-password');
			assert.equal(loadedItem.content.password(), 'new-password');

			testLib.continueTests();
		})
		.done();
	})
	.done();
});

testLib.addAsyncTest('Remove item', (assert) => {
	let item: item_store.Item;
	let vault: agile_keychain.Vault;

	return createTestVault().then((vault_) => {
		vault = vault_;
		return vault.loadItem('CA20BB325873446966ED1F4E641B5A36');
	}).then((item_) => {
		item = item_.item;
		assert.equal(item.title, 'Facebook');
		assert.equal(item.typeName, item_store.ItemTypes.LOGIN);
		assert.ok(item.isRegularItem());

		var content = item_.content;
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
		return asyncutil.result(vault.fs.stat(`${vault.path}/data/default/${item.uuid}.1password`));
	}).then(statResult => {
		// the .1password file should have been removed, with
		// just a tombstone entry left in the contents.js file
		assert.equal(statResult.value, undefined);
		assert.ok(statResult.error instanceof vfs.VfsError);
		assert.equal((<vfs.VfsError>statResult.error).type, vfs.ErrorType.FileNotFound);
	});
});

testLib.addTest('listItems() should not list tombstones', assert => {
	let testVault: TestVault;
	return createTestVaultWithNItems(1).then(testVault_ => {
		testVault = testVault_;
		return testVault_.vault.listItems();
	}).then(listedItems => {
		assert.equal(listedItems.length, 1);
		return testVault.items[0].remove();
	}).then(() => {
		return testVault.vault.listItems();
	}).then(listedItems => {
		assert.equal(listedItems.length, 0);
		return testVault.vault.listItems({ includeTombstones: true });
	}).then(listedItems => {
		assert.equal(listedItems.length, 1);
	});
});

testLib.addTest('Generate Passwords', (assert) => {
	var usedPasswords = new Set<string>();
	for (var len = 4; len < 20; len++) {
		for (var k = 0; k < 10; k++) {
			var pass = password_gen.generatePassword(len);
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
		assert.equal(item.title, loadedItem.item.title);
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
		return asyncutil.result(agile_keychain.Vault.createVault(fs, path, newPass, hint, keyIterations));
	}).then((result) => {
		assert.ok(result.error instanceof vfs.VfsError);

		// check that the original vault has not been modified
		return vault.unlock(pass);
	});
});

function createTestLoginItem(id: number) {
	return item_builder.createItem({
		title: `Login ${id}`,
		username: `user${id}`,
		password: `pass${id}`,
		url: `https://foobar.com/users/${id}`
	});
}

interface TestVault {
	vault: agile_keychain.Vault;
	items: item_store.Item[];
}

function createTestVaultWithNItems(n: number): Q.Promise<TestVault> {
	let vault: agile_keychain.Vault;
	let items: item_store.Item[] = [];
	return createEmptyVault().then(_vault => {
		vault = _vault;
		let saved: Q.Promise<void>[] = [];
		for (let i = 0; i < n; i++) {
			var item = createTestLoginItem(i);
			items.push(item);
			saved.push(item.saveTo(vault));
		}
		return Q.all(saved);
	}).then(() => ({
		vault: vault,
		items: items
	}));
}

testLib.addAsyncTest('listItemStates() matches listItems() output', assert => {
	let vault: agile_keychain.Vault;
	let items: item_store.Item[];
	return createTestVaultWithNItems(3).then(result => {
		vault = result.vault;
		items = result.items;
		return Q.all([vault.listItemStates(), vault.listItems()]);
	}).then((items: [item_store.ItemState[], item_store.Item[]]) => {
		assert.equal(items[0].length, items[1].length);

		items[0].sort((a, b) => a.uuid.localeCompare(b.uuid));
		items[1].sort((a, b) => a.uuid.localeCompare(b.uuid));

		for (let i = 0; i < items[0].length; i++) {
			assert.deepEqual(items[0][i].uuid, items[1][i].uuid);
			assert.deepEqual(items[0][i].revision, items[1][i].revision);
			assert.deepEqual(items[0][i].deleted, items[1][i].isTombstone());
		}
	});
});

// if the contents.js files and .1password files get out of sync, the .1password
// file is the source of truth
testLib.addAsyncTest('listItemStates(), listItems() should not list item if .1password file is not present', assert => {
	let testVault: TestVault;
	return createTestVaultWithNItems(3).then(testVault_ => {
		testVault = testVault_;
		return testVault.vault.fs.list(testVault.vault.path + '/data/default');
	}).then(entries => {
		let itemID = testVault.items[0].uuid;
		let itemPath = testVault.vault.itemPath(itemID);
		return testVault.vault.fs.rm(itemPath);
	}).then(() => {
		return testVault.vault.listItemStates();
	}).then(items => {
		assert.equal(items.length, 2);
		return testVault.vault.listItems();
	}).then(items => {
		assert.equal(items.length, 2);
	});
});

testLib.addAsyncTest('Removing item succeeds if file is already removed', assert => {
	let testVault: TestVault;
	return createTestVaultWithNItems(1).then(testVault_ => {
		testVault = testVault_;
		let itemPath = testVault.vault.itemPath(testVault.items[0].uuid);
		return testVault.vault.fs.rm(itemPath);
	}).then(() => {
		return testVault.items[0].remove();
	}).then(() => {
		assert.ok(testVault.items[0].isTombstone());
	});
});

