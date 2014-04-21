/// <reference path="../../typings/DefinitelyTyped/node/node.d.ts" />

import testLib = require('../test');
import fastSha1 = require('./sha1opt');

var parallel = require('paralleljs');

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

testLib.addTest('SHA-1', (assert) => {
	var hash = new fastSha1.SHA1();
	SHA1_TEST_VECTORS.forEach(function(tst) {
		var srcBuf = fastSha1.bufferFromString(tst.msg);
		var digest = new Int32Array(5);
		hash.hash(srcBuf, digest);
		var actual = fastSha1.hexlify(digest);
		assert.equal(actual, tst.digest, 'check SHA-1 digests match');
	});
});

testLib.addTest('HMAC-SHA1', (assert) => {
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

testLib.addTest('PBKDF2-HMAC-SHA1', (assert) => {
	var pbkdf2 = new fastSha1.PBKDF2();
	PBKDF2_TEST_VECTORS.forEach(function(tst) {
		var passBuf = fastSha1.bufferFromString(tst.pass);
		var saltBuf = fastSha1.bufferFromString(tst.salt);
		var actualKey = fastSha1.hexlify(pbkdf2.key(passBuf, saltBuf, tst.iterations, tst.dkLen));
		assert.equal(actualKey, tst.key, 'check PBKDF2 keys match');
	});
});

testLib.addAsyncTest('PBKDF2 Parallel', (assert) => {
	var params = {
		pass : "passwordPASSWORDpassword",
		salt : "saltSALTsaltSALTsaltSALTsaltSALTsalt",
		iterations : 4096,
		dkLen : 25,
		key : "3d2eec4fe41c849b80c8d83662c0e44a8b291a964cf2f07038"
	};

	var blocks = [
		{ params : params, blockIndex : 0 },
		{ params : params, blockIndex : 1 }
	];

	var pbkdfBlock = (blockParams : any) => {
		var fastSha1 = require('../../../build/lib/crypto/sha1opt');
		var pbkdf2 = new fastSha1.PBKDF2();
		var passBuf = fastSha1.bufferFromString(blockParams.params.pass);
		var saltBuf = fastSha1.bufferFromString(blockParams.params.salt);
		return pbkdf2.keyBlock(passBuf,
		  saltBuf,
		  blockParams.params.iterations,
		  blockParams.blockIndex
		);
	};

	var par = new parallel(blocks, {
	});
	par.map(pbkdfBlock).then((blocks: Uint8Array[]) => {
		var result = new Uint8Array(params.dkLen);
		var resultIndex = 0;
		blocks.forEach((block) => {
			for (var i=0; resultIndex < params.dkLen && i < block.byteLength; i++) {
				result[resultIndex] = block[i];
				++resultIndex;
			}
		});
		assert.equal(fastSha1.hexlify(result), params.key, 'Check PBKDF2 result matches');
		testLib.continueTests();
	});
});

testLib.runTests();

