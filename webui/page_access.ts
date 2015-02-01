/// <reference path="../typings/DefinitelyTyped/chrome/chrome.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/dom.d.ts" />

import Q = require('q');

import event_stream = require('../lib/base/event_stream');
import forms = require('./forms');
import rpc = require('../lib/net/rpc');
import site_info = require('../lib/siteinfo/site_info');
import site_info_service = require('../lib/siteinfo/service');
import stringutil = require('../lib/base/stringutil');

class ExtensionUrlFetcher {
	private rpc: rpc.RpcHandler;

	constructor(rpc: rpc.RpcHandler) {
		this.rpc = rpc;
	}

	fetch(url: string) : Q.Promise<site_info_service.UrlResponse> {
		var result = Q.defer<site_info_service.UrlResponse>();
		this.rpc.call('fetch-url', [url], result.makeNodeResolver());
		return result.promise;
	}
}

export interface ClipboardAccess {
	clipboardAvailable() : boolean;
	copy(type: string, data: string) : void;
}

/** Interface for interacting with forms in the current web page
  * from the extension front-end.
  */
export interface PageAccess {
	/** Returns the URI that should be used as the redirect target
	  * for OAuth authentication requests.
	  *
	  * In the Firefox add-on this must be set as redirects
	  * from external websites back to resource:// URLs are
	  * disallowed, so a redirect back to a dummy http://
	  * URL is used, which is intercepted by the add-on.
	  */
	oauthRedirectUrl() : string;

	/** Fetch a list of auto-fillable fields on the current page. */
	findForms(callback: (formList: forms.FieldGroup[]) => void) : void;

	/** Auto-fill fields on the current page.
	  * Returns a promise for the number of fields that were auto-filled.
	  */
	autofill(fields: forms.AutoFillEntry[]) : Q.Promise<number>;
	
	/** Emits events when the extension's UI is shown. */
	showEvents: event_stream.EventStream<void>;

	/** Emits events when the URL of the active page or
	  * tab changes.
	  */
	pageChanged: event_stream.EventStream<string>;

	/** URL of the active page or tab. */
	currentUrl: string;

	/** Interface to retrieve info about URLs associated
	  * with items.
	  */
	siteInfoProvider() : site_info.SiteInfoProvider;

	/** Hide the passcards item list panel. */
	hidePanel(): void;
}

/** Interface exposed by priviledged browser extension code for triggering input field
  * searches and form autofills on the active tab.
  *
  * The extension code communicates back to the unpriviledged front-end
  * using window.postMessage()
  */
export interface ExtensionConnector {
	currentUrl: string;
	oauthRedirectUrl: string;
}

/** A stub extension connector with no-op findForms()
  * and autofill() methods.
  */
export class FakeExtensionConnector implements ExtensionConnector {
	currentUrl: string;
	oauthRedirectUrl: string;
	syncService: string;

	constructor() {
		this.currentUrl = '';
		this.syncService = 'dropbox';
	}
}

/** Implementation of PageAccess which uses window.postMessage() to
  * communicate between the UI for an extension and the
  * priviledged extension code via an ExtensionConnector
  * which has access to browser tabs etc.
  */
export class ExtensionPageAccess implements PageAccess, ClipboardAccess {
	private rpc: rpc.RpcHandler;
	private connector: ExtensionConnector;
	private siteInfoService: site_info_service.SiteInfoService;

	showEvents: event_stream.EventStream<void>;
	pageChanged: event_stream.EventStream<string>;
	currentUrl: string;

	constructor(extension: ExtensionConnector) {
		this.connector = extension;
		this.pageChanged = new event_stream.EventStream<string>();
		this.showEvents = new event_stream.EventStream<void>();
		this.rpc = new rpc.RpcHandler(new rpc.WindowMessagePort(window, '*', 'extension-app', 'extension-core'));
		this.currentUrl = extension.currentUrl;
		this.siteInfoService = new site_info_service.SiteInfoService(new ExtensionUrlFetcher(this.rpc));

		this.rpc.on<void>('pagechanged', (url: string) => {
			this.currentUrl = url;
			this.pageChanged.publish(url);
		});
		this.rpc.on<void>('show', () => {
			this.showEvents.publish(null);
		});
	}

	findForms(callback: (fieldList: forms.FieldGroup[]) => void) {
		this.rpc.call('find-fields', [], (err: any, fieldList: forms.FieldGroup[]) => {
			if (err) {
				callback([]);
				return;
			}
			callback(fieldList);
		});
	}

	oauthRedirectUrl() {
		return this.connector.oauthRedirectUrl;
	}

	autofill(fields: forms.AutoFillEntry[]) : Q.Promise<number> {
		var filled = Q.defer<number>();
		this.rpc.call('autofill', [fields], filled.makeNodeResolver());
		return filled.promise;
	}

	siteInfoProvider() : site_info.SiteInfoProvider {
		return this.siteInfoService;
	}

	hidePanel() {
		this.rpc.call('hide-panel', [], () => {
			/* no-op */
		});
	}

	copy(mimeType: string, data: string) {
		this.rpc.call('copy', [mimeType, data], () => {
			/* no-op */
		});
	}

	clipboardAvailable() {
		return true;
	}
};

/** Methods added to the `window` object for notifications
  * from the popup
  */
interface ChromeExtBackgroundWindow extends Window {
	notifyPageChanged(tab: chrome.tabs.Tab) : void;
}

/** Connector between the main app and the active tab in the Chrome
  * extension.
  */
export class ChromeExtensionPageAccess implements PageAccess, ClipboardAccess {
	private siteInfoService: site_info_service.SiteInfoService;
	private tabPorts: {
		[index: number] : rpc.RpcHandler;
	};

	showEvents: event_stream.EventStream<void>;
	pageChanged: event_stream.EventStream<string>;
	currentUrl: string;
	
	constructor() {
		this.currentUrl = '';
		this.showEvents = new event_stream.EventStream<void>();
		this.pageChanged = new event_stream.EventStream<string>();
		this.siteInfoService = new site_info_service.SiteInfoService({
			fetch: (url) => {
				return Q.reject<site_info_service.UrlResponse>(new Error('URL fetching not implemented in Chrome extension'));
			}
		});
		this.tabPorts = {};

		// expose a function to allow the passcards browser action
		// to notify the extension when the URL for the active tab changes
		var chromeExtBackgroundWindow = <ChromeExtBackgroundWindow>window;
		chromeExtBackgroundWindow.notifyPageChanged = (tab: chrome.tabs.Tab) => {
			var currentUrl = tab.url;

			// the extension does not have permission to inspect or
			// modify chrome:// pages, so treat them as empty tabs
			if (stringutil.startsWith(tab.url, 'chrome://')) {
				currentUrl = '';
			}

			this.currentUrl = currentUrl;
			this.pageChanged.publish(currentUrl);

			if (currentUrl != '') {
				// if URL is non-empty, load page script for
				// form discovery and autofill
				chrome.tabs.executeScript(null, {
					file: 'data/dist/scripts/page_bundle.js'
				});
			}
			
			this.showEvents.publish(null);
		};
	}

	oauthRedirectUrl() : string {
		// Chrome extension uses a custom driver
		// instead of the standard redirect flow
		return null;
	}

	findForms(callback: (formList: forms.FieldGroup[]) => void) : void {
		this.connectToCurrentTab().then((rpc) => {
			rpc.call('find-fields', [], (err: any, forms: forms.FieldGroup[]) => {
				if (err) {
					console.log('Error listing form fields:', err);
					callback([]);
					return;
				}
				callback(forms);
			});
		});
	}

	autofill(fields: forms.AutoFillEntry[]) : Q.Promise<number> {
		var filled = Q.defer<number>();
		this.connectToCurrentTab().then((rpc) => {
			rpc.call('autofill', [fields], filled.makeNodeResolver());
		});
		return filled.promise;
	}
	
	siteInfoProvider() : site_info.SiteInfoProvider {
		return this.siteInfoService;
	}

	hidePanel() : void {
		chrome.browserAction.getPopup({}, (doc) => {
			var appWindow = <any>window;
			appWindow.hidePanel();
		});
	}

	copy(mimeType: string, data: string) {
		var tempTextElement = document.createElement('textarea');
		document.body.appendChild(tempTextElement);
		tempTextElement.value = data;
		tempTextElement.setSelectionRange(0, data.length);
		document.execCommand('copy');
		document.body.removeChild(tempTextElement);
	}

	clipboardAvailable() {
		return true;
	}

	private connectToCurrentTab() : Q.Promise<rpc.RpcHandler> {
		var tabRpc = Q.defer<rpc.RpcHandler>();
		chrome.windows.getCurrent((window) => {
			chrome.tabs.query({active:true, windowId: window.id}, (tabs) => {
				if (tabs.length == 0) {
					tabRpc.reject(new Error('No tabs active'));
					return;
				}
				var activeTab = tabs[0];
				if (this.tabPorts.hasOwnProperty(activeTab.id.toString())) {
					tabRpc.resolve(this.tabPorts[activeTab.id]);
				} else {
					var tabPort = new rpc.ChromeMessagePort(activeTab.id);
					var newTabRpc = new rpc.RpcHandler(tabPort);
					this.tabPorts[activeTab.id] = newTabRpc;
					tabRpc.resolve(newTabRpc);
				}
			});
		});
		return tabRpc.promise;
	}
}
