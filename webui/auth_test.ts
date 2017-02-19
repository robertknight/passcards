import assert = require('assert');
import urlLib = require('url');

import auth = require('./auth');
import testLib = require('../lib/test');

const AUTH_SERVER_URL = 'http://acmecloud.com/oauth2/authorize';

interface FakeAuthWindowOpenerConfig {
	crossOriginWindowOpenReturnsNull: boolean;
}

// fake implementation of the subset of the Window
// interface used by OAuthFlow to open the cloud storage
// provider's authentication page
class FakeAuthWindowOpener implements auth.AuthWindowOpener {
	expectedRedirectURI: string;

	private accessToken: string;
	private config: FakeAuthWindowOpenerConfig;
	private storage: Map<string, string>;

	localStorage: {
		getItem(key: string): string;
		removeItem(key: string): void;
	};

	constructor(expectedRedirectURI: string, accessToken: string,
				config?: FakeAuthWindowOpenerConfig) {
		this.expectedRedirectURI = expectedRedirectURI;
		this.storage = new Map<string, string>();
		this.accessToken = accessToken;
		this.config = config || {
			crossOriginWindowOpenReturnsNull: false,
		};

		let opener = this;

		this.localStorage = {
			getItem(key: string) {
				return opener.storage.get(key) || '';
			},

			removeItem(key: string) {
				opener.storage.delete(key);
			}
		};
	}

	open(url: string, target: string, options: string) {
		let parsedURL = urlLib.parse(url);
		parsedURL.search = '';
		assert.equal(urlLib.format(parsedURL), AUTH_SERVER_URL);

		let params = urlLib.parse(url, true /* parse query */);
		let redirectUri = params.query['redirect_uri'];
		let state = params.query['state'];

		assert.equal(redirectUri, this.expectedRedirectURI);

		setTimeout(() => {
			this.storage.set('PASSCARDS_OAUTH_TOKEN', JSON.stringify({
				accessToken: this.accessToken,
				state
			}));
		}, 10);

		if (this.config.crossOriginWindowOpenReturnsNull) {
			return null;
		}

		return {
			closed: false,
			close() {
				this.closed = true;
			}
		};
	}
}

function testAuthOpts() {
	let authRedirectURL = 'http://clientapp/receive-auth-token';
	let authOpts = {
		authServerURL: (uri: string, state : string) =>
			`${AUTH_SERVER_URL}?redirect_uri=${uri}&state=${state}`,
		authRedirectURL
	};

	let accessToken = 'dummytoken';
	let authWindowOpener = new FakeAuthWindowOpener(authRedirectURL, accessToken);
	let authHandler = new auth.OAuthFlow(authOpts);

	return { authRedirectURL, accessToken, authOpts };
}

testLib.addTest('OAuth login succeeds', assert => {
	const { authRedirectURL, accessToken, authOpts } = testAuthOpts();
	let authWindowOpener = new FakeAuthWindowOpener(authRedirectURL, accessToken);
	let authHandler = new auth.OAuthFlow(authOpts);
	return authHandler.authenticate(authWindowOpener).then(credentials => {
		assert.equal(credentials.accessToken, accessToken);
	});
});

testLib.addTest('OAuth login succeeds if window.open returns null', (assert) => {
	const { authRedirectURL, accessToken, authOpts } = testAuthOpts();
	const authWindowOpener = new FakeAuthWindowOpener(authRedirectURL, accessToken, {
		crossOriginWindowOpenReturnsNull: true,
	});
	const authHandler = new auth.OAuthFlow(authOpts);
	return authHandler.authenticate(authWindowOpener).then(credentials => {
		assert.equal(credentials.accessToken, accessToken);
	});

});

// test for the redirect page which receives the OAuth access token
// from the cloud storage provider
testLib.addTest('auth receiver script', assert => {
	// stub out the parts of Window and Document used by the auth
	// receiver script
	var global_: any = global;
	let {window, document } = global_;
	let storage = new Map<string, string>();
	let windowDidClose = false;

	global_.document = {
		location: {
			// note use of URL-encoded chars in 'state' parameter,
			// which should be URI-decoded before being saved
			hash: '#access_token=dummytoken&state=abc%3D%3D'
		}
	};
	global_.window = {
		localStorage: {
			setItem(key: string, value: string) {
				storage.set(key, value);
			}
		},

		// add chrome.extension to the Window API so
		// that auth_receiver detects the environment as
		// a Chrome extension
		chrome: {
			extension: {}
		},

		close() {
			windowDidClose = true;
		}
	};

	// load the auth receiver script.
	// This should extract the parameters from the location hash
	// and write them to local storage
	require('./auth_receiver');

	assert.deepEqual(storage.get('PASSCARDS_OAUTH_TOKEN'), JSON.stringify({
		accessToken: 'dummytoken',
		state: 'abc=='
	}));

	// test that the auth window attempts to close itself
	assert.equal(windowDidClose, true);

	global_.window = window;
	global_.document = document;
});
