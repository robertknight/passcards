import Q = require('q');
import url = require('url');

import assign = require('../lib/base/assign');

/** Opaque by stringify-able object representing
 * the credentials returned by a login attempt
 */
interface Credentials {
}

/** Interface for handling the auth flow for a
 * cloud service.
 */
interface AuthFlow {
	/** Start the authentication process and return a promise
	 * for a set of credentials which is resolved once the login
	 * completes.
	 */
	authenticate(): Q.Promise<Credentials>;
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

interface OAuthFlowOptions {
    authServerURL: string;
    authRedirectURL?: string;
	windowSettings?: WindowSettings;
}

/** Drives the UI for OAuth 2.0 authentication for a cloud service
 * using the implicit grant (aka. 'token') authentication flow.
 *
 * This flow opens a popup window at a specified authorization URL,
 * waits for the user to complete authentication in that popup window
 * and then returns the credentials for use with API calls for that service.
 */
export class OAuthFlow implements AuthFlow {
	private options: OAuthFlowOptions;

	constructor(options: OAuthFlowOptions) {
		this.options = assign<OAuthFlowOptions>({}, {
			windowSettings: {}
		}, options);
	}

	authenticate() {
		let credentials = Q.defer();

		// open a window which displays the auth UI, send
		// a message requesting the auth process to begin
		let authWindowSettings = windowSettingsToString(this.options.windowSettings);
		let target = '_blank';
		if ('target' in this.options.windowSettings) {
			target = this.options.windowSettings.target;
		}

		let parsedAuthURL = url.parse(this.options.authServerURL, true /* parse query string */);
		parsedAuthURL.query.redirect_uri = this.options.authRedirectURL;

		// clear search property so that query is reconstructed from parsedAuthURL.query
		parsedAuthURL.search = undefined;

		let authURL = url.format(parsedAuthURL);
		let authWindow: Window = window.open(authURL, target, authWindowSettings);

		// poll, waiting for auth to complete
		let pollTimeout = setInterval(() => {
			authWindow.postMessage({
				type: 'auth-query-status'
			}, this.options.authRedirectURL);
		}, 200);

		// wait for a message back indicating that authentication
		// completed
		let authCompleteListener = (e: MessageEvent) => {
			let message: AuthMessage = e.data;
			if ('type' in message && message.type === 'auth-complete') {
				credentials.resolve(message.credentials);
			}
		};
		window.addEventListener('message', authCompleteListener);

		authWindow.addEventListener('close', (e: CloseEvent) => {
			credentials.reject(new Error('Window closed before auth completed'));
		});

		credentials.promise.finally(() => {
			authWindow.close();
			window.removeEventListener('message', authCompleteListener);
			clearTimeout(pollTimeout);
		});

		return credentials.promise;
	}
}
