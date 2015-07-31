/// <reference path="../typings/firefox-content-script.d.ts" />

// the 'content script' for the extension's main panel.
//
// This is loaded before the front-end itself so that it can set up
// the browser integration interface (an implementation of page_access.PageAccess)
// for use by the app when it loads.

import stringutil = require('../../../lib/base/stringutil');
import page_access = require('../../../webui/page_access');
import rpc = require('../../../lib/net/rpc');

var selfWorker: ContentWorker = <any>self;

var OAUTH_REDIRECT_URL = 'http://localhost:8234';

if (stringutil.startsWith(window.location.href, OAUTH_REDIRECT_URL)) {
	selfWorker.port.emit('oauth-credentials-received', window.location.hash);
}

var pageAccess = createObjectIn<page_access.ExtensionConnector>(unsafeWindow, { defineAs: 'firefoxAddOn' });

// setup handler that sends/receives messages from the priviledged add-on
// code (in src/main.ts)
var extensionRpc = new rpc.RpcHandler(selfWorker.port);

// setup handler that sends/receives messages from the unpriviledged UI
// for passcards
var appUiRpc = new rpc.RpcHandler(new rpc.WindowMessagePort(document.defaultView, '*', 'extension-core', 'extension-app'));
appUiRpc.clone = (data) => {
	return cloneInto(data, unsafeWindow);
};

pageAccess.oauthRedirectUrl = OAUTH_REDIRECT_URL;

// forwards an RPC request from the app UI to the priviledged extension code,
// which in turn may forward the request to the active tab. When the main
// extension script returns a reply, that is forwarded back to the app UI
// via the `done` callback
var forwardAsyncRpcCall = (method: string, done: Function, ...args: any[]) => {
	extensionRpc.call(method, args, (err: any, ...result: any[]) => {
		done.apply(null, [err].concat(result));
	});
}

appUiRpc.onAsync('find-fields', forwardAsyncRpcCall.bind(null, 'find-fields'));
appUiRpc.onAsync('autofill', forwardAsyncRpcCall.bind(null, 'autofill'));
appUiRpc.onAsync('fetch-url', forwardAsyncRpcCall.bind(null, 'fetch-url'));

appUiRpc.on('hide-panel', () => {
	extensionRpc.call('hide-panel', []);
});

appUiRpc.on<void>('copy', (mimeType: string, data: string) => {
	extensionRpc.call('copy', [mimeType, data]);
});

extensionRpc.on<void>('pagechanged', (url: string) => {
	pageAccess.currentUrl = url;
	appUiRpc.call('pagechanged', [url]);
});

extensionRpc.on('show', () => {
	appUiRpc.call('show', []);
});

// notify the add-on that the panel content script is ready.
// Note that the panel content script is loaded _before_
// the front-end so this event does not indicate that
// the front-end itself is ready.
extensionRpc.call('ready', []);

