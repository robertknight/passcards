/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
var Q = require('q');
var crypto = require('./onepass_crypto');

var Path = require('path');

var atob = require('atob');

var defaultCryptoImpl = new crypto.CryptoJsCrypto();

// Converts a UNIX timestamp in milliseconds since
// the epoch to a JS Date
function dateFromUNIXDate(timestamp) {
    return new Date(timestamp * 1000);
}

var EncryptionKeyEntry = (function () {
    function EncryptionKeyEntry() {
    }
    return EncryptionKeyEntry;
})();
exports.EncryptionKeyEntry = EncryptionKeyEntry;

(function (CryptoAlgorithm) {
    CryptoAlgorithm[CryptoAlgorithm["AES128_OpenSSLKey"] = 0] = "AES128_OpenSSLKey";
})(exports.CryptoAlgorithm || (exports.CryptoAlgorithm = {}));
var CryptoAlgorithm = exports.CryptoAlgorithm;

var CryptoParams = (function () {
    function CryptoParams(algo, salt) {
        this.algo = algo;
        this.salt = salt;
    }
    return CryptoParams;
})();
exports.CryptoParams = CryptoParams;


/** A simple key agent which just stores keys in memory */
var SimpleKeyAgent = (function () {
    function SimpleKeyAgent(cryptoImpl) {
        this.crypto = cryptoImpl || defaultCryptoImpl;
        this.keys = {};
    }
    SimpleKeyAgent.prototype.addKey = function (id, key) {
        this.keys[id] = key;
        return Q.resolve(null);
    };

    SimpleKeyAgent.prototype.listKeys = function () {
        return Q.resolve(Object.keys(this.keys));
    };

    SimpleKeyAgent.prototype.forgetKeys = function () {
        this.keys = {};
        return Q.resolve(null);
    };

    SimpleKeyAgent.prototype.decrypt = function (id, cipherText, params) {
        if (!this.keys.hasOwnProperty(id)) {
            return Q.reject('No such key');
        }
        switch (params.algo) {
            case 0 /* AES128_OpenSSLKey */:
                return Q.resolve(crypto.decryptAgileKeychainItemData(this.crypto, this.keys[id], params.salt, cipherText));
            default:
                return Q.reject('Unknown encryption algorithm');
        }
    };
    return SimpleKeyAgent;
})();
exports.SimpleKeyAgent = SimpleKeyAgent;

/** Map of item type codes to human-readable item type names */
exports.ITEM_TYPES = {
    "webforms.WebForm": {
        name: "Login",
        shortAlias: "login"
    },
    "wallet.financial.CreditCard": {
        name: "Credit Card",
        shortAlias: "card"
    },
    "wallet.computer.Router": {
        name: "Wireless Router",
        shortAlias: "router"
    },
    "securenotes.SecureNote": {
        name: "Secure Note",
        shortAlias: "note"
    },
    "passwords.Password": {
        name: "Password",
        shortAlias: "pass"
    },
    "wallet.onlineservices.Email.v2": {
        name: "Email Account",
        shortAlias: "email"
    },
    "system.folder.Regular": {
        name: "Folder",
        shortAlias: "folder"
    },
    "system.folder.SavedSearch": {
        name: "Smart Folder",
        shortAlias: "smart-folder"
    },
    "wallet.financial.BankAccountUS": {
        name: "Bank Account",
        shortAlias: "bank"
    },
    "wallet.computer.Database": {
        name: "Database",
        shortAlias: "db"
    },
    "wallet.government.DriversLicense": {
        name: "Driver's License",
        shortAlias: "driver"
    },
    "wallet.membership.Membership": {
        name: "Membership",
        shortAlias: "membership"
    },
    "wallet.government.HuntingLicense": {
        name: "Outdoor License",
        shortAlias: "outdoor"
    },
    "wallet.government.Passport": {
        name: "Passport",
        shortAlias: "passport"
    },
    "wallet.membership.RewardProgram": {
        name: "Reward Program",
        shortAlias: "reward"
    },
    "wallet.computer.UnixServer": {
        name: "Unix Server",
        shortAlias: "server"
    },
    "wallet.government.SsnUS": {
        name: "Social Security Number",
        shortAlias: "social"
    },
    "wallet.computer.License": {
        name: "Software License",
        shortAlias: "software"
    },
    "identities.Identity": {
        name: "Identity",
        shortAlias: "id"
    },
    // internal entry type created for items
    // that have been removed from the trash
    "system.Tombstone": {
        name: "Tombstone",
        shortAlias: "tombstone"
    }
};

/** Represents a single item in a 1Password vault. */
var Item = (function () {
    function Item(vault) {
        this.vault = vault;
    }
    /** Retrieves and decrypts the content of a 1Password item.
    *
    * In the Agile Keychain format, items are stored in two parts.
    * The overview data is stored in both contents.js and replicated
    * in the <UUID>.1password file for the item and is unencrypted.
    *
    * The item content is stored in the <UUID>.1password file and
    * is encrypted using the vault's master key.
    *
    * The item's vault must be unlocked using Vault.unlock() before
    * item content can be retrieved.
    */
    Item.prototype.getContent = function () {
        var _this = this;
        var itemContent = Q.defer();

        if (this.content) {
            itemContent.resolve(this.content);
            return itemContent.promise;
        }

        if (!this.vault) {
            itemContent.reject('content not available');
            return itemContent.promise;
        }

        this.vault.loadItem(this.uuid).then(function (item) {
            return _this.vault.decryptItemData(item.securityLevel, item.encrypted);
        }).then(function (content) {
            itemContent.resolve(ItemContent.fromAgileKeychainObject(JSON.parse(content)));
        }).done();

        return itemContent.promise;
    };

    Item.prototype.setContent = function (content) {
        this.content = content;
    };

    /** Returns true if this is a 'tombstone' entry remaining from
    * a deleted item. When an item is deleted, all of the properties except
    * the UUID are erased and the item's type is changed to 'system.Tombstone'.
    *
    * These 'tombstone' markers are preserved so that deletions are synced between
    * different 1Password clients.
    */
    Item.prototype.isTombstone = function () {
        return this.typeName == 'system.Tombstone';
    };

    /** Returns a shortened version of the item's UUID, suitable for disambiguation
    * between different items with the same type and title.
    */
    Item.prototype.shortID = function () {
        return this.uuid.slice(0, 4);
    };

    /** Returns the human-readable type name for this item's type. */
    Item.prototype.typeDescription = function () {
        if (exports.ITEM_TYPES[this.typeName]) {
            return exports.ITEM_TYPES[this.typeName].name;
        } else {
            return this.typeName;
        }
    };

    /** Parses an Item from JSON data in a .1password file.
    *
    * The item content is initially encrypted. The decrypted
    * contents can be retrieved using getContent()
    */
    Item.fromAgileKeychainObject = function (vault, data) {
        var item = new Item(vault);
        item.updatedAt = dateFromUNIXDate(data.updatedAt);
        item.title = data.title;
        item.securityLevel = data.securityLevel;

        if (data.encrypted) {
            item.encrypted = atob(data.encrypted);
        }
        if (data.secureContents) {
            item.setContent(ItemContent.fromAgileKeychainObject(data.secureContents));
        }

        item.typeName = data.typeName;
        item.uuid = data.uuid;
        item.createdAt = dateFromUNIXDate(data.createdAt);
        item.location = data.location;
        item.folderUuid = data.folderUuid;
        item.faveIndex = data.faveIndex;
        item.trashed = data.trashed;
        item.openContents = data.openContents;
        return item;
    };
    return Item;
})();
exports.Item = Item;

/** Represents a 1Password vault. */
var Vault = (function () {
    /** Setup a vault which is stored at @p path in a filesystem.
    * @p fs is the filesystem interface through which the
    * files that make up the vault are accessed.
    */
    function Vault(fs, path, keyAgent) {
        this.fs = fs;
        this.path = path;
        this.keyAgent = keyAgent || new SimpleKeyAgent(defaultCryptoImpl);
        this.keys = this.readKeyData();
    }
    Vault.prototype.readKeyData = function () {
        var keys = Q.defer();
        var content = this.fs.read(Path.join(this.path, 'data/default/encryptionKeys.js'));
        content.then(function (content) {
            var keyList = JSON.parse(content);
            if (!keyList.list) {
                keys.reject('Missing `list` entry in encryptionKeys.js file');
                return;
            }
            var vaultKeys = [];
            keyList.list.forEach(function (entry) {
                var item = new EncryptionKeyEntry;
                item.data = atob(entry.data);
                item.identifier = entry.identifier;
                item.iterations = entry.iterations;
                item.level = entry.level;
                item.validation = atob(entry.validation);

                // Using 1Password v4, there are two entries in the
                // encryptionKeys.js file, 'SL5' and 'SL3'.
                // 'SL3' appears to be unused so speed up the unlock
                // process by skipping it
                if (item.level != "SL3") {
                    vaultKeys.push(item);
                }
            });
            keys.resolve(vaultKeys);
        }, function (err) {
            console.log('unable to get enc keys');
            keys.reject(err);
        }).done();

        return keys.promise;
    };

    /** Unlock the vault using the given master password.
    * This must be called before item contents can be decrypted.
    */
    Vault.prototype.unlock = function (pwd) {
        var _this = this;
        return this.keys.then(function (keyEntries) {
            keyEntries.forEach(function (item) {
                var saltCipher = extractSaltAndCipherText(item.data);
                var key = exports.decryptKey(pwd, saltCipher.cipherText, saltCipher.salt, item.iterations, item.validation);
                _this.keyAgent.addKey(item.identifier, key);
            });
            return Q.resolve(null);
        });
    };

    /** Lock the vault. This discards decrypted master keys for the vault
    * created via a call to unlock()
    */
    Vault.prototype.lock = function () {
        this.keyAgent.forgetKeys();
    };

    /** Returns true if the vault was successfully unlocked using unlock().
    * Only once the vault is unlocked can item contents be retrieved using Item.getContents()
    */
    Vault.prototype.isLocked = function () {
        return Q.all([this.keyAgent.listKeys(), this.keys]).spread(function (keyIDs, keyEntries) {
            var locked = false;
            keyEntries.forEach(function (entry) {
                if (keyIDs.indexOf(entry.identifier) == -1) {
                    locked = true;
                }
            });
            return locked;
        });
    };

    Vault.prototype.loadItem = function (uuid) {
        var _this = this;
        var item = Q.defer();
        var content = this.fs.read(Path.join(this.path, 'data/default/' + uuid + '.1password'));

        content.then(function (content) {
            item.resolve(Item.fromAgileKeychainObject(_this, JSON.parse(content)));
        }, function (err) {
            item.reject(err);
        }).done();

        return item.promise;
    };

    /** Returns a list of overview data for all items in the vault,
    * except tombstone markers for deleted items.
    */
    Vault.prototype.listItems = function () {
        var _this = this;
        var items = Q.defer();
        var content = this.fs.read(Path.join(this.path, 'data/default/contents.js'));
        content.then(function (content) {
            var entries = JSON.parse(content);
            var vaultItems = [];
            entries.forEach(function (entry) {
                var item = new Item(_this);
                item.uuid = entry[0];
                item.typeName = entry[1];
                item.title = entry[2];
                item.location = entry[3];
                item.updatedAt = dateFromUNIXDate(entry[4]);
                item.folderUuid = entry[5];
                item.trashed = entry[7] === "Y";

                if (item.isTombstone()) {
                    // skip markers for deleted items
                    return;
                }

                vaultItems.push(item);
            });
            items.resolve(vaultItems);
        }, function (err) {
            items.reject(err);
        }).done();
        return items.promise;
    };

    Vault.prototype.decryptItemData = function (level, data) {
        var _this = this;
        return this.keys.then(function (keys) {
            var result;
            keys.forEach(function (key) {
                if (key.level == level) {
                    var saltCipher = extractSaltAndCipherText(data);
                    var cryptoParams = new CryptoParams(0 /* AES128_OpenSSLKey */, saltCipher.salt);
                    result = _this.keyAgent.decrypt(key.identifier, saltCipher.cipherText, cryptoParams);
                    return;
                }
            });
            if (result) {
                return result;
            } else {
                return Q.reject('No key ' + level + ' found');
            }
        });
    };
    return Vault;
})();
exports.Vault = Vault;

var SaltedCipherText = (function () {
    function SaltedCipherText(salt, cipherText) {
        this.salt = salt;
        this.cipherText = cipherText;
    }
    return SaltedCipherText;
})();
exports.SaltedCipherText = SaltedCipherText;

/** Represents the content of an item, usually stored
* encrypted in a vault.
*/
var ItemContent = (function () {
    function ItemContent() {
        this.sections = [];
        this.urls = [];
        this.notes = '';
        this.formFields = [];
        this.htmlMethod = '';
        this.htmlAction = '';
        this.htmlId = '';
    }
    /** Convert a decrypted JSON `contents` blob from a 1Password item
    * into an ItemContent instance.
    */
    ItemContent.fromAgileKeychainObject = function (data) {
        var content = new ItemContent();
        if (data.sections) {
            data.sections.forEach(function (section) {
                content.sections.push(ItemSection.fromAgileKeychainObject(section));
            });
        }
        if (data.URLs) {
            data.URLs.forEach(function (url) {
                content.urls.push(url);
            });
        }
        if (data.notes) {
            content.notes = data.notes;
        }
        if (data.fields) {
            data.fields.forEach(function (field) {
                content.formFields.push(field);
            });
        }
        if (data.htmlAction) {
            content.htmlAction = data.htmlAction;
        }
        if (data.htmlMethod) {
            content.htmlMethod = data.htmlMethod;
        }
        if (data.htmlID) {
            content.htmlId = data.htmlId;
        }

        return content;
    };
    return ItemContent;
})();
exports.ItemContent = ItemContent;

/** Content of an item which is usually stored unencrypted
* as part of the overview data.
*/
var ItemOpenContents = (function () {
    function ItemOpenContents() {
    }
    return ItemOpenContents;
})();
exports.ItemOpenContents = ItemOpenContents;

var ItemSection = (function () {
    function ItemSection() {
    }
    /** Convert a section entry from the JSON contents blob for
    * an item into an ItemSection instance.
    */
    ItemSection.fromAgileKeychainObject = function (data) {
        var section = new ItemSection();
        section.name = data.name;
        section.title = data.title;
        section.fields = [];
        if (data.fields) {
            data.fields.forEach(function (fieldData) {
                section.fields.push(ItemField.fromAgileKeychainObject(fieldData));
            });
        }
        return section;
    };
    return ItemSection;
})();
exports.ItemSection = ItemSection;

var ItemField = (function () {
    function ItemField() {
    }
    ItemField.prototype.valueString = function () {
        return this.value;
    };

    ItemField.fromAgileKeychainObject = function (fieldData) {
        var field = new ItemField;
        field.kind = fieldData.k;
        field.name = fieldData.n;
        field.title = fieldData.t;
        field.value = fieldData.v;
        return field;
    };
    return ItemField;
})();
exports.ItemField = ItemField;

/** Saved value of an input field in a web form. */
var WebFormField = (function () {
    function WebFormField() {
    }
    return WebFormField;
})();
exports.WebFormField = WebFormField;

/** Entry in an item's 'Websites' list. */
var ItemUrl = (function () {
    function ItemUrl() {
    }
    return ItemUrl;
})();
exports.ItemUrl = ItemUrl;

function extractSaltAndCipherText(input) {
    var salt = input.substring(8, 16);
    var cipher = input.substring(16);
    return new SaltedCipherText(salt, cipher);
}

function decryptKey(masterPwd, encryptedKey, salt, iterCount, validation) {
    var KEY_LEN = 32;
    var derivedKey = defaultCryptoImpl.pbkdf2(masterPwd, salt, iterCount, KEY_LEN);
    var aesKey = derivedKey.substring(0, 16);
    var iv = derivedKey.substring(16, 32);
    var decryptedKey = defaultCryptoImpl.aesCbcDecrypt(aesKey, encryptedKey, iv);
    var validationSaltCipher = extractSaltAndCipherText(validation);

    var keyParams = crypto.openSSLKey(defaultCryptoImpl, decryptedKey, validationSaltCipher.salt);
    var decryptedValidation = defaultCryptoImpl.aesCbcDecrypt(keyParams.key, validationSaltCipher.cipherText, keyParams.iv);

    if (decryptedValidation != decryptedKey) {
        throw 'Failed to decrypt key';
    }

    return decryptedKey;
}
exports.decryptKey = decryptKey;
//# sourceMappingURL=onepass.js.map
