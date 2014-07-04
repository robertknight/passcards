/// <reference path="../typings/firefox-addon-sdk.d.ts" />

/// FIXME - AVOID DUPLICATING THIS
declare enum FieldType {
    Text = 0,
    Password = 1,
    Other = 2,
}
interface InputField {
    id: string;
    name: string;
    type: FieldType;
}
interface AutoFillEntry {
    fieldId: string;
    fieldName: string;
    value: string;
}

/** Interface exposed by browser extensions.
*/
interface PageAccess {
    /** Register a callback that is invoked when the URL
    * of the active page changes, either by switching tabs
    * or by switching page in the active tab.
    */
    addPageChangedListener(listener: (url: string) => void): void;
    /** Fetch a list of auto-fillable fields on the current page. */
    findForms(callback: (formList: InputField[]) => void): void;
    /** Auto-fill fields on the current page */
    autofill(fields: AutoFillEntry[]): void;
}
/// FIXME - AVOID DUPLICATING THIS

var pageAccess: PageAccess = createObjectIn(unsafeWindow, { defineAs: 'firefoxAddOn' });
var pageChangedListeners: Array<(url: string) => void> = [];

pageAccess.addPageChangedListener = (listener) => {
	pageChangedListeners.push(listener);
}

var self_ = <any>self;
self_.port.on('pagechanged', (url: string) => {
	pageChangedListeners.forEach((listener) => {
		listener(url);
	});
});

pageAccess.findForms = (callback) => {
	console.log('finding forms in page');
};

pageAccess.autofill = (fields) => {
	self_.port.emit('autofill', fields);
};

