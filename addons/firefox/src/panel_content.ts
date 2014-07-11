/// <reference path="../typings/firefox-addon-sdk.d.ts" />

// the 'content script' for the extension's main panel.
//
// This is loaded before the front-end itself so that it can set up
// the browser integration interface (an implementation of page_access.PageAccess)
// for use by the app when it loads.

import stringutil = require('../../../lib/base/stringutil');
import page_access = require('../../../webui/page_access');

var selfWorker: ContentWorker = <any>self;

var OAUTH_REDIRECT_URL = 'http://localhost:8234';

if (stringutil.startsWith(window.location.href, OAUTH_REDIRECT_URL)) {
	selfWorker.port.emit('oauth-credentials-received', window.location.hash);
}

var pageAccess = createObjectIn<page_access.ExtensionConnector>(unsafeWindow, { defineAs: 'firefoxAddOn' });

pageAccess.oauthRedirectUrl = OAUTH_REDIRECT_URL;

function postMessageToFrontend(m: page_access.Message) {
	// in Firefox >= 31 we should use window.postMessage() instead.
	// In Firefox <= 30 document.defaultView.postMessage() needs
	// to be used.
	//
	// See https://developer.mozilla.org/en-US/Add-ons/SDK/Guides/Content_Scripts/Interacting_with_page_scripts#postMessage()_before_Firefox_31
	//
	document.defaultView.postMessage(m, '*');
}

pageAccess.findForms = exportFunction(() => {
	selfWorker.port.once('found-fields', (fields: page_access.InputField[]) => {
		var fieldsClone = cloneInto(fields, unsafeWindow);
		var msg: page_access.Message = {
			fromContentScript: true,
			type: page_access.MessageType.FieldsFound,
			pageURL: pageAccess.currentUrl,
			fields: fieldsClone
		};
		postMessageToFrontend(msg);
	});
	selfWorker.port.emit('find-fields');
}, pageAccess);

pageAccess.autofill = exportFunction((fields) => {
	selfWorker.port.emit('autofill', fields);
}, pageAccess);

selfWorker.port.on('pagechanged', (url: string) => {
	pageAccess.currentUrl = url;
	var msg: page_access.Message = {
		fromContentScript: true,
		type: page_access.MessageType.PageChanged,
		pageURL: url,
		fields: []
	}
	postMessageToFrontend(msg);
});

// notify the add-on that the panel content script is ready.
// Note that the panel content script is loaded _before_
// the front-end so this event does not indicate that
// the front-end itself is ready.
selfWorker.port.emit('ready');

