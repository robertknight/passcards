// the page script which is injected into browser tabs
// to collect details of fill-able fields and auto-fill
// fields

var self_ = <any>self;

import page_access = require('../../../webui/page_access');

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

self_.port.on('find-fields', () => {
	var fieldElements = document.getElementsByTagName('input');
	var fields: page_access.InputField[] = [];
	for (var i=0; i < fieldElements.length; i++) {
		var elt = fieldElements.item(i);
		var field : page_access.InputField = {
			id: elt.id,
			name: elt.name,
			type: inputFieldType(elt.type),
			placeholder: elt.placeholder
		};
		var ariaAttr = elt.attributes['aria-label'];
		if (ariaAttr) {
			field.ariaLabel = ariaAttr.value;
		}

		fields.push(field);
	}
	self_.port.emit('found-fields', fields);
});

self_.port.on('autofill', (entries: page_access.AutoFillEntry[]) => {
	var fieldElements = document.getElementsByTagName('input');
	for (var i=0; i < fieldElements.length; i++) {
		var elt = fieldElements.item(i);
		entries.forEach((entry) => {
			if ((entry.fieldId && entry.fieldId == elt.id) || 
			    (entry.fieldName && entry.fieldName == elt.name)) {
				elt.value = entry.value;
			}
		});
	}
});
