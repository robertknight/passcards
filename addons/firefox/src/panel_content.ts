/// <reference path="../typings/firefox-addon-sdk.d.ts" />

import page_access = require('../../../webui/page_access');

var pageAccess: page_access.PageAccess = createObjectIn(unsafeWindow, { defineAs: 'firefoxAddOn' });
var pageChangedListeners: Array<(url: string) => void> = [];
var currentURL: string;

pageAccess.addPageChangedListener = (listener) => {
	pageChangedListeners.push(listener);
	if (currentURL) {
		listener(currentURL);
	}
}

var self_ = <any>self;
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
