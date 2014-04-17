var rusha_sha1 = require('rusha');
var fastSha1 = require('./sha1opt');

const testVectors = [
	{ msg : "abc",
	  digest : "a9993e364706816aba3e25717850c26c9cd0d89d" },
	{ msg : "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
	  digest : "84983e441c3bd26ebaae4aa1f95129e5e54670f1" }
]

var testQueue = [];
if (typeof test == 'undefined') {
	test = function(name, func) {
		testQueue.push(func);
	}
	equal = function(actual, expected, msg) {
		if (actual != expected) {
			console.log('Failed: ' + msg);
		}
	}
}

test('SHA-1', function() {
	var hash = new fastSha1.FastSha1();
	testVectors.forEach(function(tst) {
		var srcBuf = new Uint8Array(tst.msg.length);
		fastSha1.FastSha1.strToBuf(tst.msg, srcBuf);
		var digest = new Int32Array(5);
		hash.sha1(srcBuf, srcBuf.length, digest);
		var actual = fastSha1.hexlify(digest);
		equal(actual, tst.digest, 'check SHA-1 digests match');
	});
});

testQueue.forEach(function(tst) {
	tst();
});

window.testSha1 = function() {
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
}

