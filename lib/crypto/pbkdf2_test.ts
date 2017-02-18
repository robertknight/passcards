
import { bufferFromString, hexlify } from '../base/collectionutil';
import { addTest } from '../test';
import PBKDF2 from './pbkdf2';

// from RFC 6070
const PBKDF2_TEST_VECTORS = [
	{
		pass: "password",
		salt: "salt",
		iterations: 1,
		dkLen: 20,
		key: "0c60c80f961f0e71f3a9b524af6012062fe037a6"
	},
	{
		pass: "password",
		salt: "salt",
		iterations: 2,
		dkLen: 20,
		key: "ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957"
	},
	{
		pass: "password",
		salt: "salt",
		iterations: 3,
		dkLen: 20,
		key: "6b4e26125c25cf21ae35ead955f479ea2e71f6ff"
	},
	{
		pass: "password",
		salt: "salt",
		iterations: 4096,
		dkLen: 20,
		key: "4b007901b765489abead49d926f721d065a429c1"
	},
	{
		pass: "passwordPASSWORDpassword",
		salt: "saltSALTsaltSALTsaltSALTsaltSALTsalt",
		iterations: 4096,
		dkLen: 25,
		key: "3d2eec4fe41c849b80c8d83662c0e44a8b291a964cf2f07038"
	}
];

addTest('PBKDF2-HMAC-SHA1', (assert) => {
	const pbkdf2 = new PBKDF2();
	PBKDF2_TEST_VECTORS.forEach(function(tst) {
		const passBuf = bufferFromString(tst.pass);
		const saltBuf = bufferFromString(tst.salt);
		const actualKey = hexlify(pbkdf2.key(passBuf, saltBuf, tst.iterations, tst.dkLen));
		assert.equal(actualKey, tst.key, 'check pbkdf2Lib keys match');
	});
});
