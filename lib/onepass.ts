/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');
import crypto = require('./onepass_crypto');
import vfs = require('./vfs');
import Path = require('path');

var atob = require('atob');

var cryptoImpl = new crypto.CryptoJsCrypto();

// Converts a UNIX timestamp in milliseconds since
// the epoch to a JS Date
function dateFromUNIXDate(timestamp: number) : Date {
	return new Date(timestamp * 1000);
}

export class EncryptionKeyEntry {
	data : string;
	identifier : string;
	iterations : number;
	level : string;
	validation : string;
	key : string;
}

export interface ItemType {
	name : string;
	shortAlias : string;
}

export interface ItemTypeMap {
	[index: string] : ItemType;
}

/** Map of item type codes to human-readable item type names */
export var ITEM_TYPES : ItemTypeMap = {
	"webforms.WebForm": {
		name:       "Login",
		shortAlias: "login",
	},
	"wallet.financial.CreditCard": {
		name:       "Credit Card",
		shortAlias: "card",
	},
	"wallet.computer.Router": {
		name:       "Wireless Router",
		shortAlias: "router",
	},
	"securenotes.SecureNote": {
		name:       "Secure Note",
		shortAlias: "note",
	},
	"passwords.Password": {
		name:       "Password",
		shortAlias: "pass",
	},
	"wallet.onlineservices.Email.v2": {
		name:       "Email Account",
		shortAlias: "email",
	},
	"system.folder.Regular": {
		name:       "Folder",
		shortAlias: "folder",
	},
	"system.folder.SavedSearch": {
		name:       "Smart Folder",
		shortAlias: "smart-folder",
	},
	"wallet.financial.BankAccountUS": {
		name:       "Bank Account",
		shortAlias: "bank",
	},
	"wallet.computer.Database": {
		name:       "Database",
		shortAlias: "db",
	},
	"wallet.government.DriversLicense": {
		name:       "Driver's License",
		shortAlias: "driver",
	},
	"wallet.membership.Membership": {
		name:       "Membership",
		shortAlias: "membership",
	},
	"wallet.government.HuntingLicense": {
		name:       "Outdoor License",
		shortAlias: "outdoor",
	},
	"wallet.government.Passport": {
		name:       "Passport",
		shortAlias: "passport",
	},
	"wallet.membership.RewardProgram": {
		name:       "Reward Program",
		shortAlias: "reward",
	},
	"wallet.computer.UnixServer": {
		name:       "Unix Server",
		shortAlias: "server",
	},
	"wallet.government.SsnUS": {
		name:       "Social Security Number",
		shortAlias: "social",
	},
	"wallet.computer.License": {
		name:       "Software License",
		shortAlias: "software",
	},
	"identities.Identity": {
		name:       "Identity",
		shortAlias: "id",
	},
	// internal entry type created for items
	// that have been removed from the trash
	"system.Tombstone": {
		name:       "Tombstone",
		shortAlias: "tombstone",
	},
};

/** Represents a single item in a 1Password vault. */
export class Item {
	updatedAt : Date;
	title : string;
	securityLevel : string;
	encrypted : string;
	typeName : string;
	uuid : string;
	createdAt : Date;
	location : string;
	folderUuid : string;
	faveIndex : number;
	trashed : boolean;
	openContents : ItemOpenContents;

	private vault : Vault;
	private content : ItemContent;
	
	constructor(vault? : Vault) {
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
	getContent() : Q.Promise<ItemContent> {
		var itemContent : Q.Deferred<ItemContent> = Q.defer<ItemContent>();
		
		if (this.content) {
			itemContent.resolve(this.content);
			return itemContent.promise;
		}

		if (!this.vault) {
			itemContent.reject('content not available');
			return itemContent.promise;
		}

		this.vault.loadItem(this.uuid).then((item:Item) => {
			var content : string = this.vault.decryptItemData(item.securityLevel, item.encrypted);
			itemContent.resolve(ItemContent.fromAgileKeychainObject(JSON.parse(content)));
		}).done();

		return itemContent.promise;
	}

	setContent(content: ItemContent) {
		this.content = content;
	}

	/** Returns true if this is a 'tombstone' entry remaining from
	  * a deleted item. When an item is deleted, all of the properties except
	  * the UUID are erased and the item's type is changed to 'system.Tombstone'.
	  *
	  * These 'tombstone' markers are preserved so that deletions are synced between
	  * different 1Password clients.
	  */
	isTombstone() : boolean {
		return this.typeName == 'system.Tombstone';
	}

	/** Returns a shortened version of the item's UUID, suitable for disambiguation
	  * between different items with the same type and title.
	  */
	shortID() : string {
		return this.uuid.slice(0,4);
	}

	/** Returns the human-readable type name for this item's type. */
	typeDescription() : string {
		if (ITEM_TYPES[this.typeName]) {
			return ITEM_TYPES[this.typeName].name;
		} else {
			return this.typeName;
		}
	}

	/** Parses an Item from JSON data in a .1password file.
	  *
	  * The item content is initially encrypted. The decrypted
	  * contents can be retrieved using getContent()
	  */
	static fromAgileKeychainObject(vault: Vault, data: any) : Item {
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
	}
}

/** Represents a 1Password vault. */
export class Vault {
	private fs: vfs.VFS;
	private path: string;
	private keys: EncryptionKeyEntry[];

	/** Setup a vault which is stored at @p path in a filesystem.
	  * @p fs is the filesystem interface through which the
	  * files that make up the vault are accessed.
	  */
	constructor(fs: vfs.VFS, path: string) {
		this.fs = fs;
		this.path = path;
	}

	/** Unlock the vault using the given master password.
	  * This must be called before item contents can be decrypted.
	  */
	unlock(pwd: string) : Q.Promise<boolean> {
		var result = Q.defer<boolean>();
		var keys = Q.defer<EncryptionKeyEntry[]>();

		var content = this.fs.read(Path.join(this.path, 'data/default/encryptionKeys.js'));
		content.then((content:string) => {
			var keyList = JSON.parse(content);
			if (!keyList.list) {
				result.reject('Missing `list` entry in encryptionKeys.js file');
				return;
			}
			var vaultKeys : EncryptionKeyEntry[] = [];
			keyList.list.forEach((entry:any) => {
				var item = new EncryptionKeyEntry;
				item.data = atob(entry.data);
				item.identifier = entry.identifier;
				item.iterations = entry.iterations;
				item.level = entry.level;
				item.validation = atob(entry.validation);

				try {
					// Using 1Password v4, there are two entries in the
					// encryptionKeys.js file, 'SL5' and 'SL3'.
					// 'SL3' appears to be unused so speed up the unlock
					// process by skipping it
					if (item.level != "SL3") {
						var saltCipher = extractSaltAndCipherText(item.data);
						item.key = decryptKey(pwd, saltCipher.cipherText, saltCipher.salt, item.iterations, item.validation);
					}
					vaultKeys.push(item);
				} catch (ex) {
					result.reject('failed to decrypt key ' + entry.level + ex);
					return;
				}
			});
			keys.resolve(vaultKeys);
			result.resolve(true);
		}, (err: any) => {
			result.reject(err);
		})
		.done();

		keys.promise.then((keys: EncryptionKeyEntry[]) => {
			this.keys = keys;
		}).done();

		return result.promise;
	}

	/** Lock the vault. This discards decrypted master keys for the vault
	  * created via a call to unlock()
	  */
	lock() : void {
		this.keys = null;
	}

	/** Returns true if the vault was successfully unlocked using unlock().
	  * Only once the vault is unlocked can item contents be retrieved using Item.getContents()
	  */
	isLocked() : boolean {
		return this.keys === null;
	}

	loadItem(uuid: string) : Q.Promise<Item> {
		var item = Q.defer<Item>();
		var content = this.fs.read(Path.join(this.path, 'data/default/' + uuid + '.1password'));
		
		content.then((content) => {
			item.resolve(Item.fromAgileKeychainObject(this, JSON.parse(content)));
		}, (err: any) => {
			item.reject(err);
		})
		.done();

		return item.promise;
	}

	/** Returns a list of overview data for all items in the vault,
	  * except tombstone markers for deleted items.
	  */
	listItems() : Q.Promise<Item[]> {
		var items = Q.defer<Item[]>();
		var content = this.fs.read(Path.join(this.path, 'data/default/contents.js'));
		content.then((content) => {
			var entries = JSON.parse(content);
			var vaultItems : Item[] = [];
			entries.forEach((entry: any[]) => {
				var item = new Item(this);
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
		}, (err: any) => {
			items.reject(err);
		}).done();
		return items.promise;
	}

	decryptItemData(level: string, data: string) : string {
		var decrypted : string;
		this.keys.forEach((key:EncryptionKeyEntry) => {
			if (key.level == level) {
				var saltCipher : SaltedCipherText = extractSaltAndCipherText(data);
				var keyParams : AesKeyParams = openSslKey(key.key, saltCipher.salt);
				decrypted = cryptoImpl.aesCbcDecrypt(keyParams.key, saltCipher.cipherText, keyParams.iv);
			}
		});
		if (!decrypted) {
			throw 'Key ' + level + ' not found';
		}
		return decrypted;
	}
}

export class SaltedCipherText {
	constructor(public salt: string, public cipherText: string) {
	}
}

export class AesKeyParams {
	constructor(public key: string, public iv: string) {
	}
}

/** Represents the content of an item, usually stored
  * encrypted in a vault.
  */
export class ItemContent {
	sections : ItemSection[];
	urls : ItemUrl[];
	notes : string;
	formFields : WebFormField[];
	htmlMethod : string;
	htmlAction : string;
	htmlId : string;

	constructor() {
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
	static fromAgileKeychainObject(data: any) : ItemContent {
		var content = new ItemContent();
		if (data.sections) {
			data.sections.forEach((section: any) => {
				content.sections.push(ItemSection.fromAgileKeychainObject(section));
			});
		}
		if (data.URLs) {
			data.URLs.forEach((url: any) => {
				content.urls.push(url);
			});
		}
		if (data.notes) {
			content.notes = data.notes;
		}
		if (data.fields) {
			data.fields.forEach((field: any) => {
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
	}
}

/** Content of an item which is usually stored unencrypted
  * as part of the overview data.
  */
export class ItemOpenContents {
	tags : string[];

	/** Indicates where this item will be displayed.
	  * Known values are 'Always' (show everywhere)
	  * and 'Never' (never shown in browser)
	  */
	scope : string;
}

export class ItemSection {
	/** Internal name of the section. */
	name : string;
		  
	/** User-visible title for the section. */
	title : string;
	fields : ItemField[];

	/** Convert a section entry from the JSON contents blob for
	  * an item into an ItemSection instance.
	  */
	static fromAgileKeychainObject(data: any) : ItemSection {
		var section = new ItemSection();
		section.name = data.name;
		section.title = data.title;
		section.fields = [];
		if (data.fields) {
			data.fields.forEach((fieldData: any) => {
				section.fields.push(ItemField.fromAgileKeychainObject(fieldData));
			});
		}
		return section;
	}
}

export class ItemField {
	kind : string;
	name : string;
	title : string;
	value : any;

	valueString() : string {
		return this.value;
	}

	static fromAgileKeychainObject(fieldData: any) : ItemField {
		var field = new ItemField;
		field.kind = fieldData.k;
		field.name = fieldData.n;
		field.title = fieldData.t;
		field.value = fieldData.v;
		return field;
	}
}

/** Saved value of an input field in a web form. */
export class WebFormField {
	value : string;

	/** 'id' attribute of the <input> element */
	id : string;

	/** Name of the field. For web forms this is the 'name'
	  * attribute of the <input> element.
	  */
	name : string;

	/** Single-char code identifying the type of field value.
	  * (T)ext, (P)assword, (E)mail, (C)heckbox, (I)nput (eg. button)
	  */
	type : string;

	/** Purpose of the field. Known values are 'username', 'password' */
	designation : string;
}

/** Entry in an item's 'Websites' list. */
export class ItemUrl {
	label : string;
	url : string;
}

export function extractSaltAndCipherText(input: string) : SaltedCipherText {
	var salt = input.substring(8, 16);
	var cipher = input.substring(16);
	return new SaltedCipherText(salt, cipher);
}

function openSslKey(password: string, salt: string) : AesKeyParams {
	var data = password + salt;
	var key = cryptoImpl.md5Digest(data);
	var iv = cryptoImpl.md5Digest(key + data);
	return new AesKeyParams(key, iv);
}

export function decryptKey(masterPwd: any, encryptedKey: string, salt: string, iterCount: number, validation: string) : string {
	var KEY_LEN = 32;
	var derivedKey = cryptoImpl.pbkdf2(masterPwd, salt, iterCount, KEY_LEN);
	var aesKey = derivedKey.substring(0, 16);
	var iv = derivedKey.substring(16, 32);
	var decryptedKey = cryptoImpl.aesCbcDecrypt(aesKey, encryptedKey, iv);
	var validationSaltCipher : SaltedCipherText = extractSaltAndCipherText(validation);

	var keyParams : AesKeyParams = openSslKey(decryptedKey, validationSaltCipher.salt);
	var decryptedValidation = cryptoImpl.aesCbcDecrypt(keyParams.key, validationSaltCipher.cipherText, keyParams.iv);

	if (decryptedValidation != decryptedKey) {
		throw 'Failed to decrypt key';
	}

	return decryptedKey;
}

