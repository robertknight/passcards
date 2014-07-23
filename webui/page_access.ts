import event_stream = require('../lib/base/event_stream');
import rpc = require('../lib/net/rpc');

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
}

/** Types of messages exchanged between the app front-end
  * and priviledged extension code.
  */
export enum MessageType {
	PageChanged, ///< The URL of the browser's active tab changed
	FieldsFound, ///< The set of auto-fillable fields on the active tab have been
	             ///< collected
	Show ///< The app UI became visible
}

/** A message exchanged between the app front-end
  * and priviledged extension code.
  */
export interface Message {
	/** If set to true, indicates that this message is coming from
	  * the priviledged extension code, as opposed to the front-end.
	  */
	fromContentScript: boolean;
	type: MessageType;
	pageURL?: string;
	fields?: InputField[];
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
export class FakeExtensionConnector {
	currentUrl: string;
	oauthRedirectUrl: string;
	syncService: string;

	constructor() {
		this.currentUrl = '';
		this.syncService = 'dropbox';
	}

	findForms() : void {
		/* no-op */
	}

	autofill(fields: AutoFillEntry[]) : void {
		/* no-op */
	}
}

/** Implementation of PageAccess which uses window.postMessage() to
  * communicate between the UI for an extension and the
  * priviledged extension code via an ExtensionConnector
  * which has access to browser tabs etc.
  */
export class ExtensionPageAccess {
	private rpc: rpc.RpcHandler;
	private connector: ExtensionConnector;

	showEvents: event_stream.EventStream<void>;
	pageChanged: event_stream.EventStream<string>;

	constructor(extension: ExtensionConnector) {
		this.connector = extension;
		this.pageChanged = new event_stream.EventStream<string>();
		this.showEvents = new event_stream.EventStream<void>();
		this.rpc = new rpc.RpcHandler(new rpc.WindowMessagePort(window, '*', 'extension-app', 'extension-core'));

		window.addEventListener('message', (event) => {
			if (event.source != window || typeof event.data.fromContentScript == 'undefined') {
				return;
			}
			var message = <Message>event.data;
			if (!message.fromContentScript) {
				return;
			}

			if (message.type == MessageType.PageChanged) {
				this.pageChanged.publish(message.pageURL);
			} else if (message.type == MessageType.Show) {
				this.showEvents.publish(null);
			}
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
		this.rpc.call('autofill', [], (err: any, count: number) => {
			if (err) {
				// TODO - Show user an indicator that autofill failed
				return;
			}
		});
	}
};

