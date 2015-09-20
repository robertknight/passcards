// this module provides the script for the OAuth redirection page
// which the user agent is redirected to after authentication with
// the cloud storage provider completes.
//
// This page extracts the auth credentials from the URL's hash
// and saves them in local storage for the main app to pick up.
//
// The Firefox extension does not use this script but handles
// capturing and forwarding the auth details in the Firefox addon code.

interface ParamsDict {
	[key: string]: string;
}

// splits a 'key=value' pair into a [key, value]
// array. The 'value' part may contain '=' chars.
function splitHashParam(param: string): [string, string] {
	let separator = param.indexOf('=');
	if (separator === -1) {
		return [param, ''];
	} else {
		return [param.slice(0, separator),
			param.slice(separator + 1)];
	}
}

function parseHash(hash: string): ParamsDict {
	return hash.slice(1) // trim leading '#'
	.split('&')
	.map(splitHashParam)
	.reduce((obj: ParamsDict, [key, value]: [string, string]) => {
		// the Dropbox OAuth endpoint will URI encode any chars in the
		// 'state' query string parameter passed to the OAuth /authorize
		// endpoint, so decode them here
		obj[key] = decodeURIComponent(value);
		return obj;
	}, <ParamsDict>{});
}

// store the access token in local storage for the main UI to pick up.
//
// Local storage is used instead of window.postMessage() for compatibility
// with different environments - eg. Firefox 42 Nightlies do not appear
// to support postMessage() between a window opened with window.open()
// and a popup panel.

// suppress incorrect unused variable warning
/* tslint:disable no-unused-variable */
let {access_token, state } = parseHash(document.location.hash);
/* tslint:enable no-unused-variable */

window.localStorage.setItem('PASSCARDS_OAUTH_TOKEN', JSON.stringify({
	accessToken: access_token,
	state: state
}));

// auth.ts tries to close the popup window itself. In the case of the
// Chrome extension this doesn't work, so the window closes itself.
//
// For the Firefox extension, the extension UI handles closing the window.
//
window.close();
