export enum FieldType {
	Text,
	Password,
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
