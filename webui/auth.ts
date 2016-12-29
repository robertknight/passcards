import { atob, btoa } from '../lib/base/stringutil';
import assign = require('../lib/base/assign');
import crypto = require('../lib/base/crypto');
import env = require('../lib/base/env');
import { defer } from '../lib/base/promise_util';
import { parseHash } from '../lib/base/url_util';

export interface Credentials {
	/** The access token for making requests to the cloud service. */
	accessToken: string;
}

/** Interface for handling the auth flow for a
 * cloud service.
 */
interface AuthFlow {
	/** Start the authentication process and return a promise
	 * for a set of credentials which is resolved once the login
	 * completes.
	 */
	authenticate(): Promise<Credentials>;
}

interface AuthMessage {
	type: string; // 'auth-complete'
	credentials: Credentials;
}

/** Window features available for use with window.open() */
export interface WindowSettings {
	width?: number;
	height?: number;
	target?: string;
}

function windowSettingsToString(settings: WindowSettings): string {
	return Object.keys(settings).map(key => `${key}=${settings[key]}`).join(',');
}

interface TabChangeInfo {
	url?: string;
}

const DUMMY_OAUTH_REDIRECT_URL = 'http://localhost:8000/webui/index.html';

/**
  * Wait for OAuth authentication to complete and redirect to a dummy URL from
  * which we extract the hash.
  */
function interceptOAuthRedirect() {
	const listener = (tabId: number, change: TabChangeInfo) => {
		if (change.url &&
			change.url.slice(0, DUMMY_OAUTH_REDIRECT_URL.length) === DUMMY_OAUTH_REDIRECT_URL) {
			// extract OAuth token from location hash
			const accessTokenMatch = change.url.match(/access_token=([^ &]+)/);
			if (accessTokenMatch) {
				const hashStart = change.url.indexOf('#');
				const {access_token, state } = parseHash(change.url.slice(hashStart));
				window.localStorage.setItem('PASSCARDS_OAUTH_TOKEN', JSON.stringify({
					accessToken: access_token,
					state,
				}));
				chrome.tabs.remove(tabId);
				chrome.tabs.onUpdated.removeListener(listener);
			}
		}
	};

	chrome.tabs.onUpdated.addListener(listener);
}

interface OAuthFlowOptions {
	/**
	  * Function which returns the URL of the OAuth authentication endpoint.
	  */
    authServerURL(redirectUri: string, state?: string): string;
	/** The URL that the OAuth authorization endpoint will redirect
	  * back to once authentication is complete.
	  */
    authRedirectURL?: string;
	/** Window features passed to window.open() for the
	  * popup window used to present the OAuth authorization dialog.
	  */
	windowSettings?: WindowSettings;
}

// Name of the local storage key which the auth
// window saves access tokens into in order
// to communicate them back to the main window.
const OAUTH_TOKEN_KEY = 'PASSCARDS_OAUTH_TOKEN';

/** Data structure used by auth window to store token data in
  * local storage
  */
interface TokenData {
	accessToken: string;
	state: string;
}

/** Subset of the Window interface needed by OAuthFlow to interact
 * with the authentication window.
 */
export interface AuthWindow {
	close(): void;
	closed: boolean;
}

/** Subset of the Window interface needed by OAuthFlow to open
 * an authentication window.
 */
export interface AuthWindowOpener {
	open(url: string, target: string, options: string): AuthWindow;
	localStorage: {
		key? (index: number): string;
		length?: number;

		getItem(key: string): string;
		removeItem(key: string): void;
	}
}

/** Drives the UI for OAuth 2.0 authentication for a cloud service
 * using the implicit grant (aka. 'token') authentication flow.
 *
 * This flow opens a popup window at a specified authorization URL,
 * waits for the user to complete authentication in that popup window
 * and then returns the credentials for use with API calls for that service.
 */
export class OAuthFlow {
	private options: OAuthFlowOptions;

	constructor(options: OAuthFlowOptions) {
		let defaultRedirectURL: string = document.location.href.replace(/\/[a-z]+\.html|\/$|$/, '/auth.html');
		if (env.isChromeExtension()) {
			// for Firefox the auth redirect URL must be an HTTP or HTTPS
			// URL as HTTP(S) -> moz-extension:// redirects are not permitted.
			//
			// The extension intercepts the redirect from the OAuth page
			// to the dummy URL and redirects it back to the bundled auth.html
			// page
			defaultRedirectURL = DUMMY_OAUTH_REDIRECT_URL;
		}

		this.options = assign<OAuthFlowOptions>({}, {
			windowSettings: {
				width: 800,
				height: 600,
				target: '_blank'
			},
			authRedirectURL: defaultRedirectURL
		}, options);
	}

	authenticate(win: AuthWindowOpener) {
		let credentials = defer<Credentials>();
		let state = crypto.randomBytes(16);
		let authURL = this.options.authServerURL(this.options.authRedirectURL, btoa(state));

		// clear any existing tokens stored in local storage
		// TODO - Encrypt this data with a random key so that it isn't usable
		// if not removed by the call to removeItem() once auth completes
		win.localStorage.removeItem(OAUTH_TOKEN_KEY);

		let authWindow: AuthWindow

		if (env.isChromeExtension()) {
			chrome.tabs.create({ url: authURL });
			interceptOAuthRedirect();
		} else {
			// open a window which displays the auth UI
			let authWindowSettings = windowSettingsToString(this.options.windowSettings);
			let target = '_blank';
			if ('target' in this.options.windowSettings) {
				target = this.options.windowSettings.target;
			}
			authWindow = window.open(authURL, target, authWindowSettings);
		}

		// poll, waiting for auth to complete.
		// auth_receiver.ts stores the access token in local storage once
		// the auth flow completes
		let pollTimeout = setInterval(() => {
			let tokenDataStr = win.localStorage.getItem(OAUTH_TOKEN_KEY);
			if (tokenDataStr) {
				try {
					win.localStorage.removeItem(OAUTH_TOKEN_KEY);
					let tokenData = <TokenData>JSON.parse(tokenDataStr);

					let requiredFields = ['state', 'accessToken'];
					for (let field of requiredFields) {
						if (!tokenData[field]) {
							throw new Error(`Missing field "${field}" in token data`);
						}
					}

					let decodedState = atob(tokenData.state);
					if (decodedState === state) {
						credentials.resolve({
							accessToken: tokenData.accessToken
						});
					} else {
						credentials.reject(new Error('State mismatch'));
					}
				} catch (ex) {
					credentials.reject(`Failed to parse OAuth token data: ${ex.toString() }`);
				}
			}

			// check for the window being closed before auth completes.
			// see http://stackoverflow.com/a/17744260/434243
			if (authWindow) {
				credentials.reject(new Error('Window closed before auth completed'));
			}
		}, 200);

		credentials.promise
		.catch(() => { })
		.then(() => {
			if (authWindow) {
				authWindow.close();
			}
			clearTimeout(pollTimeout);
		});

		return credentials.promise;
	}
}
