// the page script which is injected into browser tabs
// to collect details of fill-able fields and auto-fill
// fields

var self_ = <any>self;

import page_access = require('../../../webui/page_access');

self_.port.on('find-fields', () => {
	var fieldElements = document.getElementsByTagName('input');
	var fields: page_access.InputField[] = [];
	for (var i=0; i < fieldElements.length; i++) {
		var elt = fieldElements.item(i);
		fields.push({
			id: elt.id,
			name: elt.name,
			type: page_access.FieldType.Text /* TODO - Map <input> type here */
		});
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
