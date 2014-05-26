/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import Q = require('q');
import underscore = require('underscore');

import crypto = require('./onepass_crypto');
import env = require('./env');
import testLib = require('./test');
import onepass = require('./onepass');
import exportLib = require('./export');
import nodefs = require('./vfs/node');
import vfs = require('./vfs/vfs');

require('es6-shim');

class TestCase {
	/** Relative path to the vault within the test data dir */
	path : string;

	/** Master password for the test vault. */
	password : string;

	/** Path to .1pif file containing expected
	  * decrypted data.
	  */
	itemDataPath : string;
}

var TEST_VAULTS : TestCase[] = [
	{
		path : 'test.agilekeychain',
		password : 'logMEin',
		itemDataPath : 'test.1pif'
	}
];
	
var fs = new nodefs.FileVFS('lib/test-data');

class ItemAndContent {
	item : onepass.Item;
	content : onepass.ItemContent;
}

function createTestVault() : Q.Promise<onepass.Vault> {
	var vault = Q.defer<onepass.Vault>();
	var fs = new nodefs.FileVFS('lib/test-data');
	vfs.VFSUtil.rmrf(fs, 'copy.agilekeychain').then(() => {
		return fs.stat('test.agilekeychain')
	}).then((srcFolder) => {
		return vfs.VFSUtil.cp(fs, srcFolder, 'copy.agilekeychain')
	}).then(() => {
		var newVault = new onepass.Vault(fs, 'copy.agilekeychain');
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
		var expectedItem = onepass.Item.fromAgileKeychainObject(null, {
		  "vault": null,
		  "updatedAt": "2014-04-25T08:05:20.000Z",
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
			"notes": "",
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
			"htmlId": ""
		  },
		  "typeName": "webforms.WebForm",
		  "uuid": "CA20BB325873446966ED1F4E641B5A36",
		  "createdAt": "2014-04-25T08:05:20.000Z",
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
	var done : Q.Promise<boolean>[] = [];
	var importer = new exportLib.PIFImporter();

	TEST_VAULTS.forEach((tst) => {
		var result = Q.defer<boolean>();
		done.push(result.promise);

		var expectedItems = importer.importItems(fs, tst.itemDataPath);
		var actualItems = Q.defer<ItemAndContent[]>();

		var vault = new onepass.Vault(fs, tst.path);
		var items : onepass.Item[];
		vault.unlock(tst.password).then(() => {
			return vault.listItems();
		}).then((_items) => {
			items = _items;
			var contents : Q.Promise<onepass.ItemContent>[] = [];
			items.forEach((item) => {
				contents.push(item.getContent());
			});
			return Q.all(contents);
		}).then((contents) => {
			var itemContents : ItemAndContent[] = [];
			items.forEach((item, index) => {
				itemContents.push({item: item, content: contents[index]});
			});
			actualItems.resolve(itemContents);
		}).done();

		Q.all([expectedItems, actualItems.promise]).then((expectedActual) => {
			var expectedAry = <onepass.Item[]> expectedActual[0];
			var actualAry = <ItemAndContent[]> expectedActual[1];

			expectedAry.sort((itemA, itemB) => {
				return itemA.uuid.localeCompare(itemB.uuid);
			});
			actualAry.sort((itemA, itemB) => {
				return itemA.item.uuid.localeCompare(itemB.item.uuid);
			});

			assert.equal(expectedAry.length, actualAry.length,
			  'actual and expected vault item counts match');

			for (var i=0; i < expectedAry.length; i++) {
				var expectedItem = expectedAry[i];
				var actualItem = actualAry[i].item;
				actualItem.setContent(actualAry[i].content);

				var diff = testLib.compareObjects(expectedItem, actualItem,
				  ['root/vault', 'root/encrypted'],
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

	Q.all(done).then(() => {
		testLib.continueTests();
	});
});

function createCryptoImpls() : crypto.CryptoImpl[] {
	var cryptoImpls : crypto.CryptoImpl[] = [];
	cryptoImpls.push(new crypto.CryptoJsCrypto);
	if (env.isNodeJS()) {
		cryptoImpls.push(new crypto.NodeCrypto);
	}
	return cryptoImpls;
}

testLib.addTest('AES encrypt/decrypt', (assert) => {
	var cryptoImpls = createCryptoImpls();	
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
	var cryptoImpls = createCryptoImpls();
	cryptoImpls.forEach((impl) => {
		var itemData = JSON.stringify({secret: 'secret-data'});
		var itemPass = 'item password';
		var encrypted = crypto.encryptAgileKeychainItemData(impl, itemPass, itemData);
		var decrypted = crypto.decryptAgileKeychainItemData(impl, itemPass, encrypted);
		assert.equal(decrypted, itemData);
	});
});

testLib.addTest('New item UUID', (assert) => {
	var item = new onepass.Item();
	assert.ok(item.uuid.match(/[0-9A-F]{32}/) != null);
});

testLib.addAsyncTest('Save item', (assert) => {
	createTestVault().then((vault) => {
		var item = new onepass.Item(vault);
		item.title = 'New Test Item';
		item.location = 'mysite.com';
		var content = new onepass.ItemContent();
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
					var comparedProps : any[] = ['title', 
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
		var item = new onepass.Item(vault);
		item.title = 'Original item title';
		item.location = 'mysite.com';

		var content = new onepass.ItemContent();
		content.formFields.push({
			id: '',
			name: 'password',
			type: onepass.FormFieldType.Password,
			designation: 'password',
			value: 'original-password'
		});
		item.setContent(content);

		var loadedItem : onepass.Item;
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
			assert.equal(passwordField.type, onepass.FormFieldType.Password);

			loadedItem.title = 'New Item Title';
			loadedItem.faveIndex = 42;
			loadedItem.location = 'newsite.com';
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
			assert.equal(loadedItem.location, 'newsite.com');
			assert.equal(loadedItem.trashed, true);

			return loadedItem.getContent();
		}).then((content) => {
			var passwordField = underscore.find(content.formFields, (field) => {
				return field.name == 'password';
			});
			assert.notEqual(passwordField, null);
			assert.equal(passwordField.value, 'new-password');

			testLib.continueTests();
		})
		.done();
	})
	.done();
});

testLib.addAsyncTest('Remove item', (assert) => {
	createTestVault().then((vault) => {
		var item : onepass.Item;
		vault.loadItem('CA20BB325873446966ED1F4E641B5A36').then((item_) => {
			item = item_;
			assert.equal(item.title, 'Facebook');
			assert.equal(item.typeName, 'webforms.WebForm');
			return item.getContent();
		}).then((content) => {
			testLib.assertEqual(assert, content.urls, [ { label: 'website', 'url' : 'facebook.com' } ]);
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
			assert.equal(item.title, 'Unnamed');
			assert.equal(item.typeName, 'system.Tombstone');
			return vault.loadItem(item.uuid);
		}).then((loadedItem) => {
			assert.ok(loadedItem.isTombstone());
			assert.equal(loadedItem.title, 'Unnamed');
			assert.equal(loadedItem.typeName, 'system.Tombstone');
			assert.equal(loadedItem.trashed, true);
			assert.equal(loadedItem.faveIndex, null);
			assert.equal(loadedItem.openContents, null);

			return loadedItem.getContent();
		}).then((content) => {
			testLib.assertEqual(assert, content, new onepass.ItemContent());
			testLib.continueTests();
		}).done();
	});
});

testLib.addTest('Generate Passwords', (assert) => {
	var usedPasswords = new Set<string>();
	for (var len = 4; len < 20; len++) {
		for (var k=0; k < 10; k++) {
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

	var derivedKey = onepass.keyFromPasswordSync(password, salt, iterations);
	var encryptedKey = onepass.encryptKey(derivedKey, masterKey);
	var decryptedKey = onepass.decryptKey(derivedKey, encryptedKey.key, encryptedKey.validation);
	assert.equal(decryptedKey, masterKey);
	assert.throws(() => {
		var derivedKey2 = onepass.keyFromPasswordSync('wrong-pass', salt, iterations);
		onepass.decryptKey(derivedKey2, encryptedKey.key, encryptedKey.validation)
	});
});

testLib.addAsyncTest('Encrypt/decrypt key (async)', (assert) => {
	var password = ' test-pass-2';
	var iterations = 100;
	var salt = crypto.randomBytes(8);
	var masterKey = crypto.randomBytes(1024);

	onepass.keyFromPassword(password, salt, iterations).then((derivedKey) => {
		var encryptedKey = onepass.encryptKey(derivedKey, masterKey);
		var decryptedKey = onepass.decryptKey(derivedKey, encryptedKey.key, encryptedKey.validation);
		assert.equal(decryptedKey, masterKey);
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('Create new vault', (assert) => {
	var fs = new nodefs.FileVFS('/tmp');
	var pass = 'test-new-vault-pass';
	var hint = 'the-password-hint';
	var vault : onepass.Vault;
	var keyIterations = 100;

	onepass.Vault.createVault(fs, '/new-vault', pass, hint, keyIterations)
	.then((vault_) => {
		vault = vault_;
		return vault.unlock(pass)
	}).then(() => {
		return vault.listItems()
	}).then((items) => {
		assert.equal(items.length, 0);

		var item = new onepass.Item(vault);
		item.title = 'Item in new vault';

		var content = new onepass.ItemContent();
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
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('Change vault password', (assert) => {
	var vault: onepass.Vault;
	createTestVault().then((vault_) => {
		vault = vault_;
		return vault.changePassword('wrong-pass', 'new-pass', 'new-hint');
	}).fail((err) => {
		assert.ok(err instanceof onepass.DecryptionError);
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
	var vault: onepass.Vault;
	var item: onepass.Item;

	createTestVault().then((vault_) => {
		vault = vault_;
		item = new onepass.Item();
		item.title = 'Existing Item';
		item.location = 'somesite.com';
		item.setContent(new onepass.ItemContent());
		return item.saveTo(vault);
	}).then(() => {
		assert.equal(item.uuid.length, 32);
		return vault.loadItem(item.uuid);
	}).then((loadedItem) => {
		assert.equal(item.title, loadedItem.title);
		testLib.continueTests();
	}).done();
});

testLib.runTests();
