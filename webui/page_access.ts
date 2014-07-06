export enum FieldType {
	Text,
	Password,
	Email,
	Other
}

export interface InputField {
	id: string;
	name: string;
	type: FieldType;
}

export interface AutoFillEntry {
	fieldId: string;
	fieldName: string;
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

	/** Register a callback that is invoked when the URL
	  * of the active page changes, either by switching tabs
	  * or by switching page in the active tab.
	  */
	addPageChangedListener(listener: (url: string) => void) : void;

	/** Fetch a list of auto-fillable fields on the current page. */
	findForms(callback: (formList: InputField[]) => void) : void;

	/** Auto-fill fields on the current page */
	autofill(fields: AutoFillEntry[]) : void;
}

/** Types of messages exchanged between the app front-end
  * and priviledged extension code.
  */
export enum MessageType {
	PageChanged,
	FieldsFound
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
	pageURL: string;
	fields: InputField[];
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
	findForms() : void;
	autofill(fields: AutoFillEntry[]) : void;
}

/** Implementation of PageAccess which uses window.postMessage() to
  * communicate between the UI for an extension and the
  * priviledged extension code via an ExtensionConnector
  * which has access to browser tabs etc.
  */
export class ExtensionPageAccess {
	private pageChangedListeners: Array<(url:string) => void>;
	private fieldsListeners: Array<(fields: InputField[]) => void>;
	private connector: ExtensionConnector;

	constructor(extension: ExtensionConnector) {
		this.connector = extension;
		this.pageChangedListeners = [];
		this.fieldsListeners = [];

		window.addEventListener('message', (event) => {
			if (event.source != window || typeof event.data.fromContentScript == 'undefined') {
				return;
			}
			var message = <Message>event.data;
			if (!message.fromContentScript) {
				return;
			}

			if (message.type == MessageType.PageChanged) {
				this.pageChangedListeners.forEach((listener) => {
					listener(message.pageURL);
				});
			} else if (message.type == MessageType.FieldsFound) {
				this.fieldsListeners.forEach((listener) => {
					listener(message.fields);
				});
			}
		});
	}

	addPageChangedListener(listener: (url: string) => void) {
		this.pageChangedListeners.push(listener);
		if (this.connector.currentUrl) {
			listener(this.connector.currentUrl);
		}
	}

	findForms(callback: (formList: InputField[]) => void) {
		this.fieldsListeners.push(callback);
		this.connector.findForms();
	}

	oauthRedirectUrl() {
		return this.connector.oauthRedirectUrl;
	}

	autofill(fields: AutoFillEntry[]) {
		this.connector.autofill(fields);
	}
};

