/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

import testLib = require('./test');
import onepass = require('./onepass');
import exportLib = require('./export');
import vfs = require('./vfs');
import Q = require('q');

var xdiff = require('xdiff');

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

class ItemAndContent {
	item : onepass.Item;
	content : onepass.ItemContent;
}

// compares two objects and outputs a diff between 'a' and 'b', excluding
// any keys which are expected to have been added in 'b' and
// any keys which are expected to have been removed in 'b'
//
// expectedAdditions and expectedDeletions are arrays of '/'-separated paths
// beginning with 'root/'
//
function compareObjects(a: any, b: any, expectedAdditions: string[], expectedDeletions: string[]) : any[] {
	var diff = xdiff.diff(a, b);
	var additions : string[] = [];
	var deletions : string[] = [];

	return diff.filter((change: any[]) => {
		var type : string = change[0];
		var path : string = change[1].join('/');

		if (type == 'set' && expectedAdditions.indexOf(path) != -1) {
			return false;
		} else if (type == 'del' && expectedDeletions.indexOf(path) != -1) {
			return false
		}
		return true;
	});
}

// set of tests which open a vault, unlock it,
// fetch all items and compare to an expected set
// of items in .1pif format
testLib.addAsyncTest('Test Vaults', (assert) => {
	var done : Q.Promise<boolean>[] = [];
	var fs = new vfs.FileVFS('lib/test-data');
	var importer = new exportLib.PIFImporter();

	TEST_VAULTS.forEach((tst) => {
		var result = Q.defer<boolean>();
		done.push(result.promise);

		var expectedItems = importer.importItems(fs, tst.itemDataPath);
		var actualItems = Q.defer<ItemAndContent[]>();

		var vault = new onepass.Vault(fs, tst.path);
		var items : onepass.Item[];
		vault.unlock(tst.password).then((success) => {
			assert.ok(success);
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

				var diff = compareObjects(expectedItem, actualItem,
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
		console.log('all tests done');
		testLib.continueTests();
	});
});

testLib.runTests();
