import { addTest } from '../test';
import { bufferFromString, hexlify } from '../base/collectionutil';
import { SHA1 } from './sha1';

const SHA1_TEST_VECTORS = [
	{
		msg: "abc",
		digest: "a9993e364706816aba3e25717850c26c9cd0d89d"
	},
	{
		msg: "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
		digest: "84983e441c3bd26ebaae4aa1f95129e5e54670f1"
	}
];

addTest('SHA-1', (assert) => {
	const hash = new SHA1();
	SHA1_TEST_VECTORS.forEach(function(tst) {
		const srcBuf = bufferFromString(tst.msg);
		const digest = new Int32Array(5);
		hash.hash(srcBuf, digest);
		const actual = hexlify(digest);
		assert.equal(actual, tst.digest, 'check SHA-1 digests match');
	});
});


