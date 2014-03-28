/// <reference path="typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="typings/DefinitelyTyped/q/Q.d.ts" />

var btoa = require('btoa');
var atob = require('atob');
var MD5 = require('crypto-js/md5');
var Q = require('q');
var Path = require('path');

import crypto = require('./crypto');
import vfs = require('./vfs');
var cryptoImpl = new crypto.CryptoJsCrypto();

export class EncryptionKeyEntry {
	data : string;
	identifier : string;
	iterations : number;
	level : string;
	validation : string;
	key : string;
}

export class Item {
	updatedAt : number;
	title : string;
	securityLevel : string;
	encrypted : string;
	typeName : string;
	uuid : string;
	createdAt : number;
	location : string;
	folderUuid : string;
	faveIndex : number;
	trashed : boolean;

	private vault : Vault;
	
	constructor(vault : Vault) {
		this.vault = vault;
	}

	getContent() : Q.IPromise<ItemContent> {
		var itemContent : Q.Deferred<ItemContent> = Q.defer();
		this.vault.loadItem(this.uuid).then((item:Item) => {
			var content : string = this.vault.decryptItemData(item.securityLevel, item.encrypted);
			itemContent.resolve(JSON.parse(content));
		});
		return itemContent.promise;
	}
}

export class Vault {
	private fs: vfs.VFS;
	private path: string;
	private keys: EncryptionKeyEntry[];

	constructor(fs: vfs.VFS, path: string) {
		this.fs = fs;
		this.path = path;
	}

	unlock(pwd: string) : Q.IPromise<boolean> {
		var result : Q.Deferred<boolean> = Q.defer();
		var keys : Q.Deferred<EncryptionKeyEntry[]> = Q.defer();

		this.fs.read(Path.join(this.path, 'data/default/encryptionKeys.js'), (error: any, content:string) => {
			if (error) {
				result.reject(error);
				return;
			}
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
					var saltCipher = extractSaltAndCipherText(item.data);
					item.key = decryptKey(pwd, saltCipher.cipherText, saltCipher.salt, item.iterations, item.validation);
					vaultKeys.push(item);
				} catch (ex) {
					result.reject('failed to decrypt key ' + entry.level + ex);
					return;
				}
			});
			keys.resolve(vaultKeys);
			result.resolve(true);
		});

		keys.promise.then((keys: EncryptionKeyEntry[]) => {
			this.keys = keys;
		});

		return result.promise;
	}

	lock() : void {
		this.keys = null;
	}

	isLocked() : boolean {
		return this.keys === null;
	}

	loadItem(uuid: string) : Q.IPromise<Item> {
		var item : Q.Deferred<Item> = Q.defer();
		this.fs.read(Path.join(this.path, 'data/default/' + uuid + '.1password'), (error: any, content: string) => {
			if (error) {
				item.reject(error);
				return;
			}
			var rawItem : Item = JSON.parse(content);
			rawItem.encrypted = atob(rawItem.encrypted);
			item.resolve(rawItem);
		});
		return item.promise;
	}

	listItems() : Q.IPromise<Item[]> {
		var items : Q.Deferred<Item[]> = Q.defer();
		this.fs.read(Path.join(this.path, 'data/default/contents.js'), (error: any, content:string) => {
			if (error) {
				items.reject(error);
				return;
			}
			var entries = JSON.parse(content);
			var vaultItems : Item[] = [];
			entries.forEach((entry: any[]) => {
				var item = new Item(this);
				item.uuid = entry[0];
				item.typeName = entry[1];
				item.title = entry[2];
				item.location = entry[3];
				item.updatedAt = entry[4];
				item.folderUuid = entry[5];
				item.trashed = entry[7] === "Y";
				vaultItems.push(item);
			});
			items.resolve(vaultItems);
		});
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

export class ItemType {
	name : string;
	shortAlias : string;
}

export class ItemContent {
	sections : ItemSection[];
	urls : ItemUrl[];
	notes : string;
	formFields : WebFormField[];
	htmlMethod : string;
	htmlAction : string;
	htmlId : string;
}

export class ItemOpenContents {
	tags : string[];
	scope : string;
}

export class ItemSection {
	name : string;
	title : string;
	fields : ItemField[];
}

export class ItemField {
	kind : string;
	name : string;
	title : string;
	value : any;
}

export class WebFormField {
	value : string;
	id : string;
	name : string;
	type : string;
	designation : string;
}

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

function strChars(str: string) : string {
	var result : number[] = [];
	for (var i=0; i < str.length; i++) {
		result.push(str.charCodeAt(i));
	}
	return '[' + result.join(' ') + ']';
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

