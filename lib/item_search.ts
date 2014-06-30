/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import underscore = require('underscore');

import onepass = require('./onepass');
import stringutil = require('./base/stringutil');

export class FieldMatch {
	url : onepass.ItemUrl;
	field : onepass.ItemField;
	formField : onepass.WebFormField;
	section : onepass.ItemSection;

	static fromURL(url: onepass.ItemUrl) : FieldMatch {
		var match = new FieldMatch;
		match.url = url;
		return match;
	}

	static fromField(section: onepass.ItemSection, field: onepass.ItemField) : FieldMatch {
		var match = new FieldMatch;
		match.field = field;
		match.section = section;
		return match;
	}

	static fromFormField(field: onepass.WebFormField) : FieldMatch {
		var match = new FieldMatch;
		match.formField = field;
		return match;
	}

	name() : string {
		if (this.url) {
			return this.url.label;
		} else if (this.field) {
			return this.field.title;
		} else if (this.formField) {
			return this.formField.name;
		}
	}

	setName(name: string) {
		if (this.url) {
			this.url.label = name;
		} else if (this.field) {
			this.field.title = name;
		} else if (this.formField) {
			this.formField.name = name;
		}
	}

	value() : string {
		if (this.url) {
			return this.url.url;
		} else if (this.field) {
			return this.field.value;
		} else if (this.formField) {
			return this.formField.value;
		}
	}

	setValue(value: string) {
		if (this.url) {
			this.url.url = value;
		} else if (this.field) {
			this.field.value = value;
		} else if (this.formField) {
			this.formField.value = value;
		}
	}

	isPassword() : boolean {
		return this.field && this.field.kind == onepass.FieldType.Password ||
		       this.formField && this.formField.type == onepass.FormFieldType.Password;
	}
}

/** Returns true if an item matches a given @p pattern.
  *
  * Looks for matches in the title, ID and location of the item.
  */
export function matchItem(item: onepass.Item, pattern: string) : boolean {
	pattern = pattern.toLowerCase();
	var titleLower = item.title.toLowerCase();
	
	if (titleLower.indexOf(pattern) != -1) {
		return true;
	}

	if (stringutil.startsWith(item.uuid.toLowerCase(), pattern)) {
		return true;
	}

	if (item.location && item.location.toLowerCase().indexOf(pattern) != -1) {
		return true;
	}

	return false;
}

/** Returns a list of items in @p vault which match a given pattern. */
export function lookupItems(vault: onepass.Vault, pattern: string) : Q.Promise<onepass.Item[]> {
	return vault.listItems().then((items) => {
		return underscore.filter(items, (item) => {
			return matchItem(item, pattern);
		});
	});
}

/** Returns a list of fields in an item's content which match @p pattern */
export function matchField(content: onepass.ItemContent, pattern: string) : FieldMatch[] {
	var matches : FieldMatch[] = [];
	content.urls.forEach((url) => {
		if (matchLabel(pattern, url.label)) {
			matches.push(FieldMatch.fromURL(url));
		}
	});
	content.formFields.forEach((field) => {
		if (matchLabel(pattern, field.name) || matchLabel(pattern, field.designation)) {
			matches.push(FieldMatch.fromFormField(field));
		}
	});
	content.sections.forEach((section) => {
		section.fields.forEach((field) => {
			if (matchLabel(pattern, field.title)) {
				matches.push(FieldMatch.fromField(section, field));
			}
		});
	});
	return matches;
}

export function matchSection(content: onepass.ItemContent, pattern: string) : onepass.ItemSection[] {
	return underscore.filter(content.sections, (section) => {
		return stringutil.indexOfIgnoreCase(section.title, pattern) != -1;
	});
}

function matchLabel(pattern: string, label: string) : boolean {
	return label && stringutil.indexOfIgnoreCase(label, pattern) != -1;
}

