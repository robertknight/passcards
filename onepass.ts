/// <reference path="typings/node/node.d.ts" />

var btoa = require('btoa');
var atob = require('atob');
var MD5 = require('crypto-js/md5');

import crypto = require('./crypto');
var cryptoImpl = new crypto.NodeCrypto();

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
}

export class SaltedCipherText {
	constructor(public salt: string, public cipherText: string) {
	}
}

export class AesKeyParams {
	constructor(public key: string, public iv: string) {
	}
}

export class EncryptionKeyEntry {
	data : string;
	identifier : string;
	iterations : number;
	level : string;
	validation : string;
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

