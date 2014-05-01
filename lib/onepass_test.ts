/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

import testLib = require('./test');
import onepass = require('./onepass');
import exportLib = require('./export');
import vfs = require('./vfs');
import Q = require('q');

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
	
var fs = new vfs.FileVFS('lib/test-data');

class ItemAndContent {
	item : onepass.Item;
	content : onepass.ItemContent;
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
testLib.addAsyncTest('Test Vaults', (assert) => {
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
				  ['root/vault'],
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

testLib.runTests();
