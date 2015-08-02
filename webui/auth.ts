import Q = require('q');

import assign = require('../lib/base/assign');

/** Opaque by stringify-able object representing
 * the credentials returned by a login attempt
 */
interface Credentials {
}

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

interface WindowSettings {
	width?: number;
	height?: number;
	target?: string;
}

interface OAuthFlowOptions {
    authServerURL: string;
    authRedirectURL?: string;
	windowSettings?: WindowSettings;
}

// 'https://www.dropbox.com/1/oauth2/authorize'

//const AUTH_REDIRECT_URL = 'https://robertknight.github.io/passcards/auth.html';

function windowSettingsToString(settings: Object): string {
	return Object.keys(settings).map(key => `${key}=${settings[key]}`).join(',');
}

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
		let authURL = `${this.options.authServerURL}?redirect_uri=${this.options.authRedirectURL}`;
		let authWindow: Window = window.open(authURL, target, authWindowSettings);

		// poll, waiting for auth to complete
		let pollTimeout = setInterval(() => {
			authWindow.postMessage({
				type: 'auth-query-status'
			}, '*' /* TODO - Restrict origin */);
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
			window.removeEventListener('message', authCompleteListener);
			clearTimeout(pollTimeout);
		});

		return credentials.promise;
	}
}
