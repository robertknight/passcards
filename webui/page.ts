/// <reference path="../addons/firefox/typings/firefox-content-script.d.ts" />

// the page script which is injected into browser tabs
// to collect details of fill-able fields and auto-fill
// fields

import env = require('../lib/base/env');
import forms = require('../webui/forms');
import rpc = require('../lib/net/rpc');

var portRpc: rpc.RpcHandler;

if (env.isChromeExtension()) {
	portRpc = new rpc.RpcHandler(new rpc.ChromeMessagePort());
} else {
	var selfWorker: ContentWorker = <any>self;
	portRpc = new rpc.RpcHandler(selfWorker.port);
}

function inputFieldType(typeStr: string) : forms.FieldType {
	switch (typeStr.toLowerCase()) {
		case 'email':
			return forms.FieldType.Email;
		case 'password':
			return forms.FieldType.Password;
		case 'checkbox':
		case 'button':
		case 'radio':
			return forms.FieldType.Other;
		default:
			return forms.FieldType.Text;
	}
}

function isElementVisible(elt: Element) {
	var rect = elt.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0;
}

// Holds the details of an input field found in
// the current document or a nested frame.
interface InputField {
	element: HTMLInputElement;
	field: forms.InputField;
}

// Set of fields returned in the most recent RPC call
// from the extension to collect the set of fields in the
// document
var lastFields : HTMLInputElement[] = [];

function collectFieldsInDocument(document: Document) : InputField[] {
	var fieldElements = document.getElementsByTagName('input');
	var fields: InputField[] = [];

	// collect fields from current document
	for (var i=0; i < fieldElements.length; i++) {
		var elt = fieldElements.item(i);

		var field : InputField = {
			element: elt,
			field: {
				key: fields.length,
				id: elt.id,
				name: elt.name,
				type: inputFieldType(elt.type),
				placeholder: elt.placeholder,
				visible: isElementVisible(elt)
			}
		};
		var ariaAttr = elt.attributes.getNamedItem('aria-label');
		if (ariaAttr) {
			field.field.ariaLabel = ariaAttr.value;
		}
		fields.push(field);
	}

	// collect fields from embedded iframes.
	//
	// FIXME: This only works for iframes hosted at the same origin as the parent document.
	// For pages where the login form is hosted on a different domain, we'll need
	// to use a browser-specific mechanism to attach to the iframe content document
	// and retrieve input fields. We'll also need suitable security checks to verify
	// the relation between the child <iframe> and the main document.
	var frames = document.querySelectorAll('iframe');
	for (var i=0; i < frames.length; i++) {
		var frame = <HTMLIFrameElement>frames.item(i);
		if (frame.contentDocument) {
			var documentFields = collectFieldsInDocument(frame.contentDocument);
			documentFields.forEach((field) => {
				field.field.key += fields.length;
			});
			fields = fields.concat(documentFields);
		}
	}

	return fields;
}

portRpc.on('find-fields', () => {
	lastFields = [];

	var inputFields = collectFieldsInDocument(document);
	lastFields = inputFields.map((field) => {
		return field.element;
	});
	
	return inputFields.map((field) => {
		return field.field;
	});
});

portRpc.on('autofill', (entries: forms.AutoFillEntry[]) => {
	var filled = 0;

	entries.forEach((entry) => {
		if (typeof entry.key == 'number' && entry.key >= 0 && entry.key < lastFields.length) {
			var elt = lastFields[entry.key];
			elt.value = entry.value;
			++filled;
		}
	});

	return filled;
});
