/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/atob.d.ts" />
/// <reference path="../typings/sprintf.d.ts" />

import atob = require('atob');
import btoa = require('btoa');
import Q = require('q');
import Path = require('path');
import sprintf = require('sprintf');
import underscore = require('underscore');

import asyncutil = require('./base/asyncutil');
import agilekeychain = require('./agilekeychain');
import collectionutil = require('./base/collectionutil');
import crypto = require('./onepass_crypto');
import dateutil = require('./base/dateutil');
import item_store = require('./item_store');
import keyAgent = require('./key_agent');
import stringutil = require('./base/stringutil');
import vfs = require('./vfs/vfs');

/** Default number of iterations to use in the PBKDF2 password
  * stretching function used to secure the master key.
  *
  * The default value was taken from a recent version of
  * the official 1Password v4 app for Mac (13/05/14)
  */
export var DEFAULT_VAULT_PASS_ITERATIONS = 80000;

// TODO: 'SL5' is the default and only used value for items
// in current versions of 1Password as far as I know but
// the Agile Keychain allows multiple security levels to be defined.
// This item data could perhaps be stored in a field for store-specific
// data within the item_store.Item?
var DEFAULT_AGILEKEYCHAIN_SECURITY_LEVEL = 'SL5';

export class DecryptionError {
	context : string;

	constructor(context?: string) {
		this.context = context;
	}

	toString() : string {
		return this.context || 'Decryption failed';
	}
}

/** Convert an item to JSON data for serialization in a .1password file.
  * @p encryptedData is the encrypted version of the item's content.
  */
export function toAgileKeychainItem(item: item_store.Item, encryptedData: string) : agilekeychain.Item {
	var keychainItem: any = {};

	keychainItem.createdAt = dateutil.unixTimestampFromDate(item.createdAt);
	keychainItem.updatedAt = dateutil.unixTimestampFromDate(item.updatedAt);
	keychainItem.title = item.title;
	keychainItem.securityLevel = DEFAULT_AGILEKEYCHAIN_SECURITY_LEVEL;
	keychainItem.encrypted = btoa(encryptedData);
	keychainItem.typeName = item.typeName;
	keychainItem.uuid = item.uuid;
	keychainItem.location = item.location;
	keychainItem.folderUuid = item.folderUuid;
	keychainItem.faveIndex = item.faveIndex;
	keychainItem.trashed = item.trashed;
	keychainItem.openContents = item.openContents;

	return keychainItem;
}

/** Parses an item_store.Item from JSON data in a .1password file.
  *
  * The item content is initially encrypted. The decrypted
  * contents can be retrieved using getContent()
  */
export function fromAgileKeychainItem(vault: Vault, data: agilekeychain.Item) : item_store.Item {
	var item = new item_store.Item(vault);
	item.updatedAt = dateutil.dateFromUnixTimestamp(data.updatedAt);
	item.title = data.title;

	// These fields are not currently stored in
	// an item_store.Item directly. They could potentially be stored in
	// a Store-specific data field in the item?
	//
	//  - data.securityLevel
	//  - data.encrypted

	if (data.secureContents) {
		item.setContent(fromAgileKeychainContent(data.secureContents));
	}

	item.typeName = data.typeName;
	item.uuid = data.uuid;
	item.createdAt = dateutil.dateFromUnixTimestamp(data.createdAt);
	item.location = data.location;
	item.folderUuid = data.folderUuid;
	item.faveIndex = data.faveIndex;
	item.trashed = data.trashed;
	item.openContents = data.openContents;
	return item;
}

export function toAgileKeychainField(field: item_store.ItemField) : agilekeychain.ItemField {
	var keychainField = new agilekeychain.ItemField;
	keychainField.k = fieldKindMap.get(field.kind);
	keychainField.n = field.name;
	keychainField.t = field.title;
	keychainField.v = field.value;
	return keychainField;
}

export function fromAgileKeychainField(fieldData: agilekeychain.ItemField) : item_store.ItemField {
	var field = new item_store.ItemField;
	field.kind = fieldKindMap.get2(fieldData.k);
	field.name = fieldData.n;
	field.title = fieldData.t;
	field.value = fieldData.v;
	return field;
}

/** Convert an item_store.ItemContent entry into a `contents` blob for storage in
  * a 1Password item.
  */
function toAgileKeychainContent(content: item_store.ItemContent) : agilekeychain.ItemContent {
	var keychainContent = new agilekeychain.ItemContent();
	if (content.sections) {
		keychainContent.sections = [];
		content.sections.forEach((section) => {
			keychainContent.sections.push(toAgileKeychainSection(section));
		});
	}
	if (content.urls) {
		keychainContent.URLs = [];
		content.urls.forEach((url) => {
			keychainContent.URLs.push(url);
		});
	}
	keychainContent.notesPlain = content.notes;
	if (content.formFields) {
		keychainContent.fields = [];
		content.formFields.forEach((field) => {
			keychainContent.fields.push(toAgileKeychainFormField(field));
		});
	}
	keychainContent.htmlAction = content.htmlAction;
	keychainContent.htmlMethod = content.htmlMethod;
	keychainContent.htmlID = content.htmlId;
	return keychainContent;
}

/** Convert a decrypted JSON `contents` blob from a 1Password item
  * into an item_store.ItemContent instance.
  */
function fromAgileKeychainContent(data: agilekeychain.ItemContent) : item_store.ItemContent {
	var content = new item_store.ItemContent();
	if (data.sections) {
		data.sections.forEach((section) => {
			content.sections.push(fromAgileKeychainSection(section));
		});
	}
	if (data.URLs) {
		data.URLs.forEach((url) => {
			content.urls.push(url);
		});
	}
	if (data.notesPlain) {
		content.notes = data.notesPlain;
	}
	if (data.fields) {
		data.fields.forEach((field) => {
			content.formFields.push(fromAgileKeychainFormField(field));
		});
	}
	if (data.htmlAction) {
		content.htmlAction = data.htmlAction;
	}
	if (data.htmlMethod) {
		content.htmlMethod = data.htmlMethod;
	}
	if (data.htmlID) {
		content.htmlId = data.htmlID;
	}

	return content;
}

function toAgileKeychainSection(section: item_store.ItemSection) : agilekeychain.ItemSection {
	var keychainSection = new agilekeychain.ItemSection();
	keychainSection.name = section.name;
	keychainSection.title = section.title;
	keychainSection.fields = [];
	section.fields.forEach((field) => {
		keychainSection.fields.push(toAgileKeychainField(field));
	});
	return keychainSection;
}

/** Convert a section entry from the JSON contents blob for
  * an item into an item_store.ItemSection instance.
  */
function fromAgileKeychainSection(data: agilekeychain.ItemSection) : item_store.ItemSection {
	var section = new item_store.ItemSection();
	section.name = data.name;
	section.title = data.title;
	section.fields = [];
	if (data.fields) {
		data.fields.forEach((fieldData) => {
			section.fields.push(fromAgileKeychainField(fieldData));
		});
	}
	return section;
}

function toAgileKeychainFormField(field: item_store.WebFormField) : agilekeychain.WebFormField {
	var keychainField = new agilekeychain.WebFormField();
	keychainField.id = field.id;
	keychainField.name = field.name;
	keychainField.type = fieldTypeCodeMap.get(field.type);
	keychainField.designation = field.designation;
	keychainField.value = field.value;
	return keychainField;
}

function fromAgileKeychainFormField(keychainField: agilekeychain.WebFormField) : item_store.WebFormField {
	var field = new item_store.WebFormField();
	field.id = keychainField.id;
	field.name = keychainField.name;
	field.type = fieldTypeCodeMap.get2(keychainField.type);
	field.designation = keychainField.designation;
	field.value = keychainField.value;
	return field;
}

/** Represents a 1Password vault. */
export class Vault {
	private fs: vfs.VFS;
	private path: string;
	private keyAgent: keyAgent.KeyAgent;
	private keys : Q.Promise<agilekeychain.EncryptionKeyEntry[]>;

	/** Setup a vault which is stored at @p path in a filesystem.
	  * @p fs is the filesystem interface through which the
	  * files that make up the vault are accessed.
	  */
	constructor(fs: vfs.VFS, path: string, agent? : keyAgent.KeyAgent) {
		this.fs = fs;
		this.path = path;
		this.keyAgent = agent || new keyAgent.SimpleKeyAgent(crypto.defaultCrypto);
	}

	private getKeys() : Q.Promise<agilekeychain.EncryptionKeyEntry[]> {
		if (!this.keys) {
			this.keys = this.loadKeys();
		}
		return this.keys;
	}

	private loadKeys() : Q.Promise<agilekeychain.EncryptionKeyEntry[]> {
		var keys = Q.defer<agilekeychain.EncryptionKeyEntry[]>();
		var content = this.fs.read(Path.join(this.dataFolderPath(), 'encryptionKeys.js'));
		content.then((content:string) => {
			var keyList : agilekeychain.EncryptionKeyList = JSON.parse(content);
			if (!keyList.list) {
				keys.reject('Missing `list` entry in encryptionKeys.js file');
				return;
			}
			var vaultKeys : agilekeychain.EncryptionKeyEntry[] = [];
			keyList.list.forEach((entry) => {
				// Using 1Password v4, there are two entries in the
				// encryptionKeys.js file, 'SL5' and 'SL3'.
				// 'SL3' appears to be unused so speed up the unlock
				// process by skipping it
				if (entry.level != "SL3") {
					vaultKeys.push(entry);
				}
			});
			keys.resolve(vaultKeys);
		}, (err) => {
			keys.reject(err);
		})
		.done();

		return keys.promise;
	}

	private saveKeys(keyList: agilekeychain.EncryptionKeyList, passHint: string) : Q.Promise<void> {
		// FIXME - Improve handling of concurrent attempts to update encryptionKeys.js.
		// If the file in the VFS has been modified since the original read, the operation
		// should fail.

		var keyJSON = collectionutil.prettyJSON(keyList);
		var keysSaved = this.fs.write(Path.join(this.dataFolderPath(), 'encryptionKeys.js'), keyJSON);
		var hintSaved = this.fs.write(Path.join(this.dataFolderPath(), '.password.hint'), passHint);
		return asyncutil.eraseResult(Q.all([keysSaved, hintSaved]));
	}

	/** Unlock the vault using the given master password.
	  * This must be called before item contents can be decrypted.
	  */
	unlock(pwd: string) : Q.Promise<void> {
		var keyEntries : agilekeychain.EncryptionKeyEntry[];
		return this.getKeys().then((keyEntries_) => {
			var derivedKeys : Q.Promise<string>[] = [];
			keyEntries = keyEntries_;
			keyEntries.forEach((item) => {
				var saltCipher = crypto.extractSaltAndCipherText(atob(item.data));
				derivedKeys.push(keyFromPassword(pwd, saltCipher.salt, item.iterations));
			});
			return Q.all(derivedKeys);
		}).then((derivedKeys) => {
			var addKeyOps : Q.Promise<void>[] = [];
			keyEntries.forEach((item, index) => {
				var saltCipher = crypto.extractSaltAndCipherText(atob(item.data));
				var key = decryptKey(derivedKeys[index], saltCipher.cipherText,
				  atob(item.validation));
				addKeyOps.push(this.keyAgent.addKey(item.identifier, key));
			});
			return asyncutil.eraseResult(Q.all(addKeyOps));
		});
	}

	/** Lock the vault. This discards decrypted master keys for the vault
	  * created via a call to unlock()
	  */
	lock() : Q.Promise<void> {
		return this.keyAgent.forgetKeys();
	}

	/** Returns true if the vault was successfully unlocked using unlock().
	  * Only once the vault is unlocked can item contents be retrieved using item_store.Item.getContents()
	  */
	isLocked() : Q.Promise<boolean> {
		return Q.all([this.keyAgent.listKeys(), this.getKeys()]).spread<boolean>(
			(keyIDs: string[], keyEntries: agilekeychain.EncryptionKeyEntry[]) => {

			var locked = false;
			keyEntries.forEach((entry) => {
				if (keyIDs.indexOf(entry.identifier) == -1) {
					locked = true;
				}
			});
			return locked;
		});
	}

	private itemPath(uuid: string) : string {
		return Path.join(this.path, 'data/default/' + uuid + '.1password')
	}

	loadItem(uuid: string) : Q.Promise<item_store.Item> {
		var content = this.fs.read(this.itemPath(uuid));
		return content.then((content) => {
			return fromAgileKeychainItem(this, JSON.parse(content));
		});
	}

	saveItem(item: item_store.Item) : Q.Promise<void> {
		var itemSaved = Q.defer<void>();
		var overviewSaved = Q.defer<void>();

		if (!item.createdAt) {
			item.createdAt = new Date();
		}

		// update last-modified time
		var prevDate = item.updatedAt;
		item.updatedAt = new Date();

		// ensure that last-modified time always advances by at least one
		// second from the previous time on save.
		//
		// This is required to ensure the 'updatedAt' time saved in contents.js
		// changes since it only stores second-level resolution
		if (prevDate && item.updatedAt.getTime() - prevDate.getTime() < 1000) {
			item.updatedAt = new Date(prevDate.getTime() + 1000);
		}

		item.getContent().then((content) => {
			var contentJSON = JSON.stringify(toAgileKeychainContent(content));
			this.encryptItemData(DEFAULT_AGILEKEYCHAIN_SECURITY_LEVEL, contentJSON).then((encryptedContent) => {
				var itemPath = this.itemPath(item.uuid);
				var keychainJSON = JSON.stringify(toAgileKeychainItem(item, encryptedContent));
				this.fs.write(itemPath, keychainJSON).then(() => {
					itemSaved.resolve(null);
				})
			}).done();
		})
		.done();

		this.fs.read(this.contentsFilePath()).then((contentsJSON) => {
			var contentEntries : any[] = JSON.parse(contentsJSON);

			var entry = underscore.find(contentEntries, (entry) => { return entry[0] == item.uuid });
			if (!entry) {
				entry = [null, null, null, null, null, null, null, null];
				contentEntries.push(entry);
			}
			entry[0] = item.uuid;
			entry[1] = item.typeName;
			entry[2] = item.title;
			entry[3] = item.location;
			entry[4] = dateutil.unixTimestampFromDate(item.updatedAt);
			entry[5] = item.folderUuid;
			entry[6] = 0; // TODO - Find out what this is used for
			entry[7] = (item.trashed ? "Y" : "N");

			// FIXME - Improve handling of concurrent updates to contents.js file.
			// If the file has been modified in the VFS since the original write then
			// the operation should fail.
			var newContentsJSON = JSON.stringify(contentEntries);
			asyncutil.resolveWith(overviewSaved, this.fs.write(this.contentsFilePath(), newContentsJSON));
		}).done();

		return <any>Q.all([itemSaved.promise, overviewSaved.promise]);
	}

	private dataFolderPath() : string {
		return Path.join(this.path, 'data/default');
	}

	private contentsFilePath() : string {
		return Path.join(this.dataFolderPath(), 'contents.js');
	}

	/** Returns a list of overview data for all items in the vault,
	  * except tombstone markers for deleted items.
	  */
	listItems() : Q.Promise<item_store.Item[]> {
		var items = Q.defer<item_store.Item[]>();
		var content = this.fs.read(this.contentsFilePath());
		content.then((content) => {
			var entries = JSON.parse(content);
			var vaultItems : item_store.Item[] = [];
			entries.forEach((entry: any[]) => {
				var item = new item_store.Item(this);
				item.uuid = entry[0];
				item.typeName = entry[1];
				item.title = entry[2];
				item.location = entry[3];
				item.updatedAt = dateutil.dateFromUnixTimestamp(entry[4]);
				item.folderUuid = entry[5];
				item.trashed = entry[7] === "Y";

				if (item.isTombstone()) {
					// skip markers for deleted items
					return;
				}

				vaultItems.push(item);
			});
			items.resolve(vaultItems);
		}, (err: any) => {
			items.reject(err);
		}).done();
		return items.promise;
	}

	decryptItemData(level: string, data: string) : Q.Promise<string> {
		return this.getKeys().then((keys) => {
			var result : Q.Promise<string>;
			keys.forEach((key) => {
				if (key.level == level) {
					var cryptoParams = new keyAgent.CryptoParams(keyAgent.CryptoAlgorithm.AES128_OpenSSLKey);
					result = this.keyAgent.decrypt(key.identifier, data, cryptoParams);
					return;
				}
			});
			if (result) {
				return result;
			} else {
				return Q.reject('No key ' + level + ' found');
			}
		});
	}

	encryptItemData(level: string, data: string) : Q.Promise<string> {
		return this.getKeys().then((keys) => {
			var result : Q.Promise<string>;
			keys.forEach((key) => {
				if (key.level == level) {
					var cryptoParams = new keyAgent.CryptoParams(keyAgent.CryptoAlgorithm.AES128_OpenSSLKey);
					result = this.keyAgent.encrypt(key.identifier, data, cryptoParams);
					return;
				}
			});
			if (result) {
				return result;
			} else {
				return Q.reject('No key ' + level + ' found');
			}
		});
	}

	/** Change the master password for the vault.
	  *
	  * This decrypts the existing master key and re-encrypts it with @p newPass.
	  *
	  * @param oldPass The current password for the vault
	  * @param newPass The new password for the vault
	  * @param newPassHint The user-provided hint for the new password
	  * @param iterations The number of iterations of the key derivation function
	  *  to use when generating an encryption key from @p newPass. If not specified,
	  *  use the same number of iterations as the existing key.
	  */
	changePassword(oldPass: string, newPass: string, newPassHint: string, iterations?: number) : Q.Promise<void> {
		return this.isLocked().then((locked) => {
			if (locked) {
				return <Q.Promise<agilekeychain.EncryptionKeyEntry[]>>
					Q.reject('Vault must be unlocked before changing the password');
			}
			return this.getKeys();
		}).then((keys) => {
			var keyList = <agilekeychain.EncryptionKeyList>{
				list: []
			};

			try {
				keys.forEach((key) => {
					var oldSaltCipher = crypto.extractSaltAndCipherText(atob(key.data));
					var newSalt = crypto.randomBytes(8);
					var derivedKey = keyFromPasswordSync(oldPass, oldSaltCipher.salt, key.iterations);
					var oldKey = decryptKey(derivedKey, oldSaltCipher.cipherText,
					  atob(key.validation));
					var newKeyIterations = iterations || key.iterations;
					var newDerivedKey = keyFromPasswordSync(newPass, newSalt, newKeyIterations);
					var newKey = encryptKey(newDerivedKey, oldKey);
					var newKeyEntry = {
						data: btoa('Salted__' + newSalt + newKey.key),
						identifier: key.identifier,
						iterations: newKeyIterations,
						level: key.level,
						validation: btoa(newKey.validation)
					};
					keyList.list.push(newKeyEntry);
					keyList[newKeyEntry.level] = newKeyEntry.identifier;
				});
			} catch (err) {
				return Q.reject(err);
			}

			this.keys = null;
			return this.saveKeys(keyList, newPassHint);
		});
	}

	/** Initialize a new empty vault in @p path with
	  * a given master @p password.
	  */
	static createVault(fs: vfs.VFS, path: string, password: string, hint: string,
	  passIterations: number = DEFAULT_VAULT_PASS_ITERATIONS) : Q.Promise<Vault> {
		if (!stringutil.endsWith(path, '.agilekeychain')) {
			path += '.agilekeychain';
		}

		var vault = new Vault(fs, path);

		// 1. Check for no existing vault at @p path
		// 2. Add empty contents.js, encryptionKeys.js, 1Password.keys files
		// 3. If this is a Dropbox folder and no file exists in the root
		//    specifying the vault path, add one
		// 4. Generate new random key and encrypt with master passworD

		var masterKey = crypto.randomBytes(1024);
		var salt = crypto.randomBytes(8);
		var derivedKey = keyFromPasswordSync(password, salt, passIterations);
		var encryptedKey = encryptKey(derivedKey, masterKey);

		var masterKeyEntry = {
			data: btoa('Salted__' + salt + encryptedKey.key),
			identifier: crypto.newUUID(),
			iterations: passIterations,
			level: 'SL5',
			validation: btoa(encryptedKey.validation)
		};

		var keyList = <agilekeychain.EncryptionKeyList>{
			list: [masterKeyEntry],
			SL5: masterKeyEntry.identifier
		};

		return fs.mkpath(vault.dataFolderPath()).then(() => {
			var keysSaved = vault.saveKeys(keyList, hint);
			var contentsSaved = fs.write(vault.contentsFilePath(), '[]');
			return Q.all([keysSaved, contentsSaved]);
		}).then(() => {
			return vault;
		});
	}

	passwordHint() : Q.Promise<string> {
		return this.fs.read(Path.join(this.dataFolderPath(), '.password.hint'));
	}

	vaultPath() : string {
		return this.path;
	}

	getRawDecryptedData(item: item_store.Item) : Q.Promise<string> {
		var encryptedContent = this.fs.read(this.itemPath(item.uuid));
		return encryptedContent.then((content) => {
			var keychainItem = <agilekeychain.Item>JSON.parse(content);
			return this.decryptItemData(keychainItem.securityLevel, atob(keychainItem.encrypted));
		});
	}

	getContent(item: item_store.Item) : Q.Promise<item_store.ItemContent> {
		return this.getRawDecryptedData(item).then((data: string) => {
			var content = <agilekeychain.ItemContent>(JSON.parse(data));
			return fromAgileKeychainContent(content);
		});
	}
}

var fieldKindMap = new collectionutil.BiDiMap<item_store.FieldType, string>()
 .add(item_store.FieldType.Text, 'string')
 .add(item_store.FieldType.Password, 'concealed')
 .add(item_store.FieldType.Address, 'address')
 .add(item_store.FieldType.Date, 'date')
 .add(item_store.FieldType.MonthYear, 'monthYear')
 .add(item_store.FieldType.URL, 'URL')
 .add(item_store.FieldType.CreditCardType, 'cctype')
 .add(item_store.FieldType.PhoneNumber, 'phone')
 .add(item_store.FieldType.Gender, 'gender')
 .add(item_store.FieldType.Email, 'email')
 .add(item_store.FieldType.Menu, 'menu');

// mapping between input element types
// and the single-char codes used to represent
// them in .1password files
var fieldTypeCodeMap = new collectionutil.BiDiMap<item_store.FormFieldType, string>()
 .add(item_store.FormFieldType.Text, 'T')
 .add(item_store.FormFieldType.Password, 'P')
 .add(item_store.FormFieldType.Email, 'E')
 .add(item_store.FormFieldType.Checkbox, 'C')
 .add(item_store.FormFieldType.Input, 'I');

var AES_128_KEY_LEN = 32; // 16 byte key + 16 byte IV

/** Derive an encryption key from a password for use with decryptKey().
  * This version is synchronous and will block the UI if @p iterCount
  * is high.
  */
export function keyFromPasswordSync(pass: string, salt: string, iterCount: number) : string {
	return crypto.defaultCrypto.pbkdf2Sync(pass, salt, iterCount, AES_128_KEY_LEN);
}

/** Derive an encryption key from a password for use with decryptKey()
  * This version is asynchronous and will not block the UI.
  */
export function keyFromPassword(pass: string, salt: string, iterCount: number) : Q.Promise<string> {
	return crypto.defaultCrypto.pbkdf2(pass, salt, iterCount, AES_128_KEY_LEN);
}

/** Decrypt the master key for a vault.
  *
  * @param derivedKey The encryption key that was used to encrypt @p encryptedKey, this is
  *   derived from a password using keyFromPassword()
  * @param encryptedKey The encryption key, encrypted with @p derivedKey
  * @param validation Validation data used to verify whether decryption was successful.
  *  This is a copy of the decrypted version of @p encryptedKey, encrypted with itself.
  */
export function decryptKey(derivedKey: string, encryptedKey: string, validation: string) : string {
	var aesKey = derivedKey.substring(0, 16);
	var iv = derivedKey.substring(16, 32);
	var decryptedKey = crypto.defaultCrypto.aesCbcDecrypt(aesKey, encryptedKey, iv);
	var validationSaltCipher = crypto.extractSaltAndCipherText(validation);

	var keyParams = crypto.openSSLKey(crypto.defaultCrypto, decryptedKey, validationSaltCipher.salt);
	var decryptedValidation = crypto.defaultCrypto.aesCbcDecrypt(keyParams.key, validationSaltCipher.cipherText, keyParams.iv);

	if (decryptedValidation != decryptedKey) {
		throw new DecryptionError('Incorrect password');
	}

	return decryptedKey;
}

export interface EncryptedKey {
	/** The master key for the vault, encrypted with a key derived from the user's
	  * master password.
	  */
	key: string;

	/** A copy of the master key encrypted with itself. This can be used to verify
	  * successful decryption of the key when it is next decrypted.
	  */
	validation: string;
}

/** Encrypt the master key for a vault.
  * @param derivedKey An encryption key for the master key, derived from a password using keyFromPassword()
  * @param decryptedKey The master key for the vault to be encrypted.
  */
export function encryptKey(derivedKey: string, decryptedKey: string) : EncryptedKey {
	var aesKey = derivedKey.substring(0, 16);
	var iv = derivedKey.substring(16, 32);
	var encryptedKey = crypto.defaultCrypto.aesCbcEncrypt(aesKey, decryptedKey, iv);

	var validationSalt = crypto.randomBytes(8);
	var keyParams = crypto.openSSLKey(crypto.defaultCrypto, decryptedKey, validationSalt);
	var validation = 'Salted__' + validationSalt + crypto.defaultCrypto.aesCbcEncrypt(keyParams.key, decryptedKey, keyParams.iv);

	return {key: encryptedKey, validation: validation};
}
