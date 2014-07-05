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

/** Interface exposed by browser extensions.
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
