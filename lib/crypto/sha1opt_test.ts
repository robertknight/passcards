/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

var qunit = require('qunitjs');
var fastSha1 = require('./sha1opt');

var SHA1_TEST_VECTORS = [
	{ msg : "abc",
	  digest : "a9993e364706816aba3e25717850c26c9cd0d89d" },
	{ msg : "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
	  digest : "84983e441c3bd26ebaae4aa1f95129e5e54670f1" }
];

// from Wikipedia and RFC 2202
var HMAC_TEST_VECTORS = [
	{ key : "",
	  message : "",
	  hmac : "fbdb1d1b18aa6c08324b7d64b71fb76370690e1d"
	},
	{ key : "key",
	  message : "The quick brown fox jumps over the lazy dog",
	  hmac : "de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9"
    },
	{
	  key : "Jefe",
	  message : "what do ya want for nothing?",
	  hmac : "effcdf6ae5eb2fa2d27416d5f184df9c259a7c79"
	}
];

// from RFC 6070
var PBKDF2_TEST_VECTORS = [
	{
		pass : "password",
		salt : "salt",
		iterations : 1,
		dkLen : 20,
		key: "0c60c80f961f0e71f3a9b524af6012062fe037a6"
	},
	{
		pass : "password",
		salt : "salt",
		iterations : 2,
		dkLen : 20,
		key : "ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957"
	},
	{
		pass : "password",
		salt : "salt",
		iterations : 3,
		dkLen : 20,
		key : "6b4e26125c25cf21ae35ead955f479ea2e71f6ff"
	},
	{
		pass : "password",
		salt : "salt",
		iterations : 4096,
		dkLen : 20,
		key : "4b007901b765489abead49d926f721d065a429c1"
	},
	{
		pass : "passwordPASSWORDpassword",
		salt : "saltSALTsaltSALTsaltSALTsaltSALTsalt",
		iterations : 4096,
		dkLen : 25,
		key : "3d2eec4fe41c849b80c8d83662c0e44a8b291a964cf2f07038"
	}
];

qunit.done((result: any) => {
	console.log('tests run. total: ' + result.total + ' failed: ' + result.failed);
	if (typeof process != 'undefined') {
		if (result.failed > 0) {
			process.exit(1)
		} else {
			process.exit(0);
		}
	}
});

qunit.log((details: any) => {
	if (!details.result) {
		console.log('test failed');
		console.log(details);
	}
});

qunit.test('SHA-1', (assert: any) => {
	var hash = new fastSha1.SHA1();
	SHA1_TEST_VECTORS.forEach(function(tst) {
		var srcBuf = fastSha1.bufferFromString(tst.msg);
		var digest = new Int32Array(5);
		hash.hash(srcBuf, digest);
		var actual = fastSha1.hexlify(digest);
		assert.equal(actual, tst.digest, 'check SHA-1 digests match');
	});
});

qunit.test('HMAC-SHA1', (assert: any) => {
	var sha1 = new fastSha1.SHA1();
	HMAC_TEST_VECTORS.forEach(function(tst) {
		var keyBuf = fastSha1.bufferFromString(tst.key);
		var msgBuf = fastSha1.bufferFromString(tst.message);
		var digest = new Int32Array(5);
		var hmac = new fastSha1.HMAC(sha1, keyBuf);
		hmac.mac(msgBuf, digest);
		var actual = fastSha1.hexlify(digest);
		assert.equal(actual, tst.hmac, 'check HMACs match');
	});
});

qunit.test('PBKDF2-HMAC-SHA1', (assert: any) => {
	var pbkdf2 = new fastSha1.PBKDF2();
	PBKDF2_TEST_VECTORS.forEach(function(tst) {
		var passBuf = fastSha1.bufferFromString(tst.pass);
		var saltBuf = fastSha1.bufferFromString(tst.salt);
		var actualKey = fastSha1.hexlify(pbkdf2.key(passBuf, saltBuf, tst.iterations, tst.dkLen));
		assert.equal(actualKey, tst.key, 'check PBKDF2 keys match');
	});
});

if (typeof window == 'undefined') {
	qunit.load();
}

