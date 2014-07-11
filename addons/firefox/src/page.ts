/// <reference path="../typings/firefox-addon-sdk.d.ts" />

// the page script which is injected into browser tabs
// to collect details of fill-able fields and auto-fill
// fields

import page_access = require('../../../webui/page_access');

var selfWorker: ContentWorker = <any>self;

function inputFieldType(typeStr: string) : page_access.FieldType {
	switch (typeStr.toLowerCase()) {
		case 'email':
			return page_access.FieldType.Email;
		case 'password':
			return page_access.FieldType.Password;
		case 'checkbox':
		case 'button':
		case 'radio':
			return page_access.FieldType.Other;
		default:
			return page_access.FieldType.Text;
	}
}

var lastFields : HTMLInputElement[] = [];

selfWorker.port.on('find-fields', () => {
	lastFields = [];

	var fieldElements = document.getElementsByTagName('input');
	var fields: page_access.InputField[] = [];
	for (var i=0; i < fieldElements.length; i++) {
		var elt = fieldElements.item(i);
		lastFields.push(elt);

		var field : page_access.InputField = {
			key: fields.length,
			id: elt.id,
			name: elt.name,
			type: inputFieldType(elt.type),
			placeholder: elt.placeholder
		};
		var ariaAttr = elt.attributes.getNamedItem('aria-label');
		if (ariaAttr) {
			field.ariaLabel = ariaAttr.value;
		}

		fields.push(field);
	}
	selfWorker.port.emit('found-fields', fields);
});

selfWorker.port.on('autofill', (entries: page_access.AutoFillEntry[]) => {
	entries.forEach((entry) => {
		if (typeof entry.key == 'number' && entry.key >= 0 && entry.key < lastFields.length) {
			var elt = lastFields[entry.key];
			elt.value = entry.value;
		}
	});
});
