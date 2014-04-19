/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />

var qunit = require('qunitjs');
var fastSha1 = require('./sha1opt');

var testVectors = [
	{ msg : "abc",
	  digest : "a9993e364706816aba3e25717850c26c9cd0d89d" },
	{ msg : "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
	  digest : "84983e441c3bd26ebaae4aa1f95129e5e54670f1" }
]

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
	var hash = new fastSha1.FastSha1();
	testVectors.forEach(function(tst) {
		var srcBuf = new Uint8Array(tst.msg.length);
		fastSha1.FastSha1.strToBuf(tst.msg, srcBuf);
		var digest = new Int32Array(5);
		hash.sha1(srcBuf, srcBuf.length, digest);
		var actual = fastSha1.hexlify(digest);
		assert.equal(actual, tst.digest, 'check SHA-1 digests match');
	});
});

qunit.test('SHA-1 benchmark', (assert: any) => {
	qunit.expect(0);

	// SHA-1 benchmark that mirrors usage by 1Password 4's
	// current default settings of 80K PBKDF2 iterations
	// using HMAC-SHA1
	var ITER = 160000;
	var hash = new fastSha1.FastSha1();
	var srcBuf = new Uint8Array(500);
	var digest = new Int32Array(5);
	var digestBuf = new Uint8Array(digest.buffer);
	var msg = "password";
	var start = new Date().getTime();
	fastSha1.FastSha1.strToBuf(msg, srcBuf);
	var srcLen = msg.length;

	for (var i=0; i < ITER; i++) {
		hash.sha1(srcBuf, srcLen, digest);
		for (var k=0; k < digestBuf.length; k++) {
			srcBuf[k] = digestBuf[k];
		}
		srcLen = digestBuf.length;
	}
	var end = new Date().getTime();
	return end-start;

	assert.equal(fastSha1.hexlify(digestBuf), 'dd79feb54a1097f8831511df9dd4522cf61063e8');
});

if (typeof window == 'undefined') {
	qunit.load();
}

