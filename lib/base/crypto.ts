import node_crypto = require('crypto');

import collectionutil = require('./collectionutil');
import env = require('./env');

/** Generate a buffer of @p length strong pseudo-random bytes */
export function randomBytes(length: number): string {
	if (env.isBrowser()) {
		// Web Crypto is prefixed in IE 11
		// see http://msdn.microsoft.com/en-gb/library/ie/dn302339%28v=vs.85%29.aspx
		var browserCrypto = window.crypto || (<any>window).msCrypto;
		if (browserCrypto && browserCrypto.getRandomValues) {
			var buffer = new Uint8Array(length);
			browserCrypto.getRandomValues(buffer);
			return collectionutil.stringFromBuffer(buffer);
		}
	} else if (env.isNodeJS()) {
		return node_crypto.pseudoRandomBytes(length).toString('binary');
	}

	// according to MDN, crypto.getRandomValues() is available in
	// IE 11, Firefox 21, Chrome 11, iOS 6 and later.
	// 
	// If we decide to support older browsers in future, we could use
	// CryptoJS' Math.random() fallback:
	//
	// - cryptoJS.lib.WordArray.random(length).toString(this.encoding);
	//
	throw new Error('No secure pseudo-random number generator available');
}

