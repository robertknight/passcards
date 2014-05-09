/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
var crypto = require('./onepass_crypto');
var testLib = require('./test');
var onepass = require('./onepass');
var exportLib = require('./export');
var Q = require('q');
var nodefs = require('./nodefs');

var TestCase = (function () {
    function TestCase() {
    }
    return TestCase;
})();

var TEST_VAULTS = [
    {
        path: 'test.agilekeychain',
        password: 'logMEin',
        itemDataPath: 'test.1pif'
    }
];

var fs = new nodefs.FileVFS('lib/test-data');

var ItemAndContent = (function () {
    function ItemAndContent() {
    }
    return ItemAndContent;
})();

testLib.addAsyncTest('Import item from .1pif file', function (assert) {
    var importer = new exportLib.PIFImporter();
    var actualItems = importer.importItems(fs, 'test.1pif');
    actualItems.then(function (items) {
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
testLib.addAsyncTest('Test Vaults', function (assert) {
    var done = [];
    var importer = new exportLib.PIFImporter();

    TEST_VAULTS.forEach(function (tst) {
        var result = Q.defer();
        done.push(result.promise);

        var expectedItems = importer.importItems(fs, tst.itemDataPath);
        var actualItems = Q.defer();

        var vault = new onepass.Vault(fs, tst.path);
        var items;
        vault.unlock(tst.password).then(function () {
            return vault.listItems();
        }).then(function (_items) {
            items = _items;
            var contents = [];
            items.forEach(function (item) {
                contents.push(item.getContent());
            });
            return Q.all(contents);
        }).then(function (contents) {
            var itemContents = [];
            items.forEach(function (item, index) {
                itemContents.push({ item: item, content: contents[index] });
            });
            actualItems.resolve(itemContents);
        }).done();

        Q.all([expectedItems, actualItems.promise]).then(function (expectedActual) {
            var expectedAry = expectedActual[0];
            var actualAry = expectedActual[1];

            expectedAry.sort(function (itemA, itemB) {
                return itemA.uuid.localeCompare(itemB.uuid);
            });
            actualAry.sort(function (itemA, itemB) {
                return itemA.item.uuid.localeCompare(itemB.item.uuid);
            });

            assert.equal(expectedAry.length, actualAry.length, 'actual and expected vault item counts match');

            for (var i = 0; i < expectedAry.length; i++) {
                var expectedItem = expectedAry[i];
                var actualItem = actualAry[i].item;
                actualItem.setContent(actualAry[i].content);

                var diff = testLib.compareObjects(expectedItem, actualItem, ['root/vault'], ['root/securityLevel', 'root/createdAt', 'root/faveIndex', 'root/openContents']);
                if (diff.length > 0) {
                    console.log(diff);
                }
                assert.equal(diff.length, 0, 'actual and expected item contents match');
            }

            result.resolve(true);
        }).done();
    });

    Q.all(done).then(function () {
        testLib.continueTests();
    });
});

function createCryptoImpls() {
    var cryptoImpls = [];
    cryptoImpls.push(new crypto.CryptoJsCrypto);
    if (testLib.environment() == 1 /* NodeJS */) {
        cryptoImpls.push(new crypto.NodeCrypto);
    }
    return cryptoImpls;
}

testLib.addTest('AES encrypt/decrypt', function (assert) {
    var cryptoImpls = createCryptoImpls();
    cryptoImpls.forEach(function (impl) {
        var plainText = 'foo bar';
        var key = 'ABCDABCDABCDABCD';
        var iv = 'EFGHEFGHEFGHEFGH';

        var cipherText = impl.aesCbcEncrypt(key, plainText, iv);
        var decrypted = impl.aesCbcDecrypt(key, cipherText, iv);

        assert.equal(decrypted, plainText);
    });
});

testLib.addTest('Encrypt/decrypt item data', function (assert) {
    var cryptoImpls = createCryptoImpls();
    cryptoImpls.forEach(function (impl) {
        var itemData = JSON.stringify({ secret: 'secret-data' });
        var itemPass = 'item password';
        var itemSalt = 'item salt';
        var encrypted = crypto.encryptAgileKeychainItemData(impl, itemPass, itemSalt, itemData);
        var decrypted = crypto.decryptAgileKeychainItemData(impl, itemPass, itemSalt, encrypted);
        assert.equal(decrypted, itemData);
    });
});

testLib.runTests();
//# sourceMappingURL=onepass_test.js.map
