var CryptoJS = require('crypto-js');
var crypto = require('crypto');
var btoa = require('btoa');
var atob = require('atob');

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

function aesCbcDecrypt(key:string, cipherText: string, iv: string) : any {
	var decipher = crypto.createDecipher('AES-128-CBC', key, iv);
	decipher.update(cipherText, 'binary', 'binary');
	return decipher.final('binary');
	/*return CryptoJS.AES.decrypt(cipherText, key, {
		mode : CryptoJS.mode.CBC,
		padding : CryptoJS.pad.Pkcs7,
		iv : iv
	});*/
}

function pbkdf2(masterPwd: string, salt: string, iterCount: number, keyLen: number) : string {
	return crypto.pbkdf2Sync(masterPwd, salt, iterCount, keyLen).toString('binary');
}

export function extractSaltAndCipherText(input : string) : string[] {
	var salt = input.substring(8, 16);
	var cipher = input.substring(16);
	return [salt, cipher];
}

function openSslKey(password: string, salt: string) : string[] {
	var data = password + salt;
	var key = CryptoJS.MD5(data);
	var iv = CryptoJS.MD5(key + data);
	return [key, iv];
}

export function decryptKey(masterPwd : string, encryptedKey : string, salt : string, iterCount : number, validation : string) : string {
	var KEY_LEN = 32;
	var derivedKey = pbkdf2(masterPwd, salt, iterCount, KEY_LEN);
	var aesKey = derivedKey.substring(0, 16);
	var iv = derivedKey.substring(16, 32);
	console.log('derived key length ' + derivedKey.length);
	console.log('encrypted key len ' + encryptedKey.length);
	var decryptedKey = aesCbcDecrypt(aesKey, encryptedKey, iv);
	console.log('decrypted key len ' + decryptedKey.words.length * 4);
	decryptedKey = decryptedKey.toString(CryptoJS.enc.Latin1);
	var validationParts : string[] = extractSaltAndCipherText(validation);
	var validationSalt = validationParts[0];
	var validationCipherText = validationParts[1];

	var keyParts = openSslKey(decryptedKey, validationSalt);
	var validationAesKey = keyParts[0];
	var validationIv = keyParts[1];
	var decryptedValidation = aesCbcDecrypt(validationAesKey, validationCipherText, validationIv);

	console.log('decrypted key ' + decryptedKey.length);
	console.log('decrypted validation ' + decryptedValidation.length);

	if (decryptedValidation != decryptedKey) {
		console.log('failed to decrypt key');
		throw 'Failed to decrypt key';
	}

	console.log('great success!');
	return decryptedKey;
}

