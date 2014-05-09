/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
var assert = require('assert');
var crypto = require('crypto');
var pbkdf2Lib = require('./crypto/pbkdf2');

var cryptoJS = require('crypto-js');

var AESKeyParams = (function () {
    function AESKeyParams(key, iv) {
        this.key = key;
        this.iv = iv;
    }
    return AESKeyParams;
})();
exports.AESKeyParams = AESKeyParams;

/** Derives an AES-128 key and initialization vector from a key of arbitrary length and salt
* using.
*/
function openSSLKey(cryptoImpl, password, salt) {
    var data = password + salt;
    var key = cryptoImpl.md5Digest(data);
    var iv = cryptoImpl.md5Digest(key + data);
    return new AESKeyParams(key, iv);
}
exports.openSSLKey = openSSLKey;

/** Encrypt the JSON data for an item for storage in the Agile Keychain format. */
function encryptAgileKeychainItemData(cryptoImpl, key, salt, plainText) {
    var keyParams = exports.openSSLKey(cryptoImpl, key, salt);
    return cryptoImpl.aesCbcEncrypt(keyParams.key, plainText, keyParams.iv);
}
exports.encryptAgileKeychainItemData = encryptAgileKeychainItemData;

/** Decrypt the encrypted contents of an item stored in the Agile Keychain format. */
function decryptAgileKeychainItemData(cryptoImpl, key, salt, cipherText) {
    var keyParams = exports.openSSLKey(cryptoImpl, key, salt);
    return cryptoImpl.aesCbcDecrypt(keyParams.key, cipherText, keyParams.iv);
}
exports.decryptAgileKeychainItemData = decryptAgileKeychainItemData;


// crypto implementation using Node.js' crypto lib
var NodeCrypto = (function () {
    function NodeCrypto() {
    }
    NodeCrypto.prototype.aesCbcDecrypt = function (key, cipherText, iv) {
        var decipher = crypto.createDecipheriv('AES-128-CBC', key, iv);
        var result = '';
        result += decipher.update(cipherText, 'binary', 'binary');
        result += decipher.final('binary');
        return result;
    };

    NodeCrypto.prototype.aesCbcEncrypt = function (key, plainText, iv) {
        var cipher = crypto.createCipheriv('AES-128-CBC', key, iv);
        var result = '';
        result += cipher.update(plainText, 'binary', 'binary');
        result += cipher.final('binary');
        return result;
    };

    NodeCrypto.prototype.pbkdf2 = function (masterPwd, salt, iterCount, keyLen) {
        var derivedKey = crypto.pbkdf2Sync(masterPwd, salt, iterCount, keyLen);
        return derivedKey.toString('binary');
    };

    NodeCrypto.prototype.md5Digest = function (input) {
        var md5er = crypto.createHash('md5');
        md5er.update(input);
        return md5er.digest('binary');
    };
    return NodeCrypto;
})();
exports.NodeCrypto = NodeCrypto;

// crypto implementation using CryptoJS plus the
// crypto functions in lib/crypto
var CryptoJsCrypto = (function () {
    function CryptoJsCrypto() {
        this.encoding = cryptoJS.enc.Latin1;
    }
    CryptoJsCrypto.prototype.aesCbcEncrypt = function (key, plainText, iv) {
        assert.equal(key.length, 16);
        assert.equal(iv.length, 16);

        var keyArray = this.encoding.parse(key);
        var ivArray = this.encoding.parse(iv);
        var plainArray = this.encoding.parse(plainText);
        var encrypted = cryptoJS.AES.encrypt(plainArray, keyArray, {
            mode: cryptoJS.mode.CBC,
            padding: cryptoJS.pad.Pkcs7,
            iv: ivArray
        });
        return encrypted.ciphertext.toString(this.encoding);
    };

    CryptoJsCrypto.prototype.aesCbcDecrypt = function (key, cipherText, iv) {
        assert.equal(key.length, 16);
        assert.equal(iv.length, 16);

        var keyArray = this.encoding.parse(key);
        var ivArray = this.encoding.parse(iv);
        var cipherArray = this.encoding.parse(cipherText);
        var cipherParams = cryptoJS.lib.CipherParams.create({
            ciphertext: cipherArray
        });
        return cryptoJS.AES.decrypt(cipherParams, keyArray, {
            mode: cryptoJS.mode.CBC,
            padding: cryptoJS.pad.Pkcs7,
            iv: ivArray
        }).toString(this.encoding);
    };

    CryptoJsCrypto.prototype.pbkdf2 = function (masterPwd, salt, iterCount, keyLen) {
        // CryptoJS' own implementation of PKBDF2 scales poorly as the number
        // of iterations increases (see https://github.com/dominictarr/crypto-bench/blob/master/results.md)
        //
        // Current versions of 1Password use 80K iterations of PBKDF2 so this needs
        // to be fast to be usable, especially on mobile devices.
        //
        // Hence we use a custom implementation of PBKDF2 based on Rusha
        var pbkdf2Impl = new pbkdf2Lib.PBKDF2();
        var passBuf = pbkdf2Lib.bufferFromString(masterPwd);
        var saltBuf = pbkdf2Lib.bufferFromString(salt);
        var key = pbkdf2Impl.key(passBuf, saltBuf, iterCount, keyLen);
        return pbkdf2Lib.stringFromBuffer(key);
    };

    CryptoJsCrypto.prototype.md5Digest = function (input) {
        return cryptoJS.MD5(this.encoding.parse(input)).toString(this.encoding);
    };
    return CryptoJsCrypto;
})();
exports.CryptoJsCrypto = CryptoJsCrypto;
//# sourceMappingURL=onepass_crypto.js.map
