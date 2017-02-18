import { bufferFromString, hexlify } from '../base/collectionutil';
import { addTest } from '../test';
import { SHA1 } from './sha1';
import { HMAC } from './hmac';

// from Wikipedia and RFC 2202
const HMAC_TEST_VECTORS = [
	{
		key: "",
		message: "",
		hmac: "fbdb1d1b18aa6c08324b7d64b71fb76370690e1d"
	},
	{
		key: "key",
		message: "The quick brown fox jumps over the lazy dog",
		hmac: "de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9"
    },
	{
		key: "Jefe",
		message: "what do ya want for nothing?",
		hmac: "effcdf6ae5eb2fa2d27416d5f184df9c259a7c79"
	}
];

addTest('HMAC-SHA1', (assert) => {
	const hash = new SHA1();
	HMAC_TEST_VECTORS.forEach(function(tst) {
		const keyBuf = bufferFromString(tst.key);
		const msgBuf = bufferFromString(tst.message);
		const digest = new Int32Array(5);
		const hmac = new HMAC(hash, keyBuf);
		hmac.mac(msgBuf, digest);
		const actual = hexlify(digest);
		assert.equal(actual, tst.hmac, 'check HMACs match');
	});
});

