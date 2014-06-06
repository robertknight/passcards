/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');

import event_stream = require('../lib/base/event_stream');
import rpc = require('../lib/net/rpc');
import site_info = require('../lib/siteinfo/site_info');
import site_info_service = require('../lib/siteinfo/service');

export enum FieldType {
	Text,
	Password,
	Email,
	Other
}

export interface InputField {
	key: any;
	type: FieldType;

	id?: string;
	name?: string;
	ariaLabel?: string;
	placeholder?: string;
}

export interface AutoFillEntry {
	key: any;
	value: string;
}

class ExtensionUrlFetcher {
	private rpc: rpc.RpcHandler;

	constructor(rpc: rpc.RpcHandler) {
		this.rpc = rpc;
	}

	fetch(url: string) : Q.Promise<site_info_service.UrlResponse> {
		var result = Q.defer<site_info_service.UrlResponse>();
		this.rpc.call('fetch-url', [url], (err: any, response: site_info_service.UrlResponse) => {
			if (err) {
				result.reject(err);
			} else {
				result.resolve(response);
			}
		});
		return result.promise;
	}
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
	findForms(callback: (formList: InputField[]) => void) : void;

	/** Auto-fill fields on the current page */
	autofill(fields: AutoFillEntry[]) : void;
	
	/** Emits events when the extension's UI is shown. */
	showEvents: event_stream.EventStream<void>;

	/** Emits events when the URL of the active page or
	  * tab changes.
	  */
	pageChanged: event_stream.EventStream<string>;

	/** URL of the acitve page or tab. */
	currentUrl: string;

	/** Interface to retrieve info about URLs associated
	  * with items.
	  */
	siteInfoProvider() : site_info.SiteInfoProvider;
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
	syncService: string;
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
export class ExtensionPageAccess implements PageAccess {
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

	findForms(callback: (formList: InputField[]) => void) {
		this.rpc.call('find-fields', [], (err: any, forms: InputField[]) => {
			if (err) {
				callback([]);
				return;
			}
			callback(forms);
		});
	}

	oauthRedirectUrl() {
		return this.connector.oauthRedirectUrl;
	}

	autofill(fields: AutoFillEntry[]) {
		this.rpc.call('autofill', [fields], (err: any, count: number) => {
			if (err) {
				// TODO - Show user an indicator that autofill failed
				return;
			}
		});
	}

	siteInfoProvider() : site_info.SiteInfoProvider {
		return this.siteInfoService;
	}
};

