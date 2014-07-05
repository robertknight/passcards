/// <reference path="../typings/firefox-addon-sdk.d.ts" />

// the 'content script' for the extension's main panel.
//
// This is loaded before the front-end itself so that it can set up
// the browser integration interface (an implementation of page_access.PageAccess)
// for use by the app when it loads.

import stringutil = require('../../../lib/base/stringutil');
import page_access = require('../../../webui/page_access');

var self_ = <any>self;

var OAUTH_REDIRECT_URL = 'http://localhost:8234';

if (stringutil.startsWith(window.location.href, OAUTH_REDIRECT_URL)) {
	self_.port.emit('oauth-credentials-received', window.location.hash);
}

var pageAccess: page_access.PageAccess = createObjectIn(unsafeWindow, { defineAs: 'firefoxAddOn' });
var pageChangedListeners: Array<(url: string) => void> = [];
var currentURL: string;

pageAccess.oauthRedirectUrl = () => {
	return OAUTH_REDIRECT_URL;
};

pageAccess.addPageChangedListener = (listener) => {
	pageChangedListeners.push(listener);
	if (currentURL) {
		listener(currentURL);
	}
}

self_.port.on('pagechanged', (url: string) => {
	currentURL = url;
	pageChangedListeners.forEach((listener) => {
		listener(url);
	});
});

pageAccess.findForms = (callback) => {
	console.log('finding forms in page');
	// TODO - Submit request to collect forms on
	// current page
};

pageAccess.autofill = (fields) => {
	self_.port.emit('autofill', fields);
};

