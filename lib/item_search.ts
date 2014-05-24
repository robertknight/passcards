/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import underscore = require('underscore');

import onepass = require('./onepass');
import stringutil = require('./stringutil');

export interface FieldMatch {
	url? : onepass.ItemUrl;
	field? : onepass.ItemField;
	formField? : onepass.WebFormField;
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
			matches.push({url : url});
		}
	});
	content.formFields.forEach((field) => {
		if (matchLabel(pattern, field.name) || matchLabel(pattern, field.designation)) {
			matches.push({formField : field});
		}
	});
	content.sections.forEach((section) => {
		section.fields.forEach((field) => {
			if (matchLabel(pattern, field.title)) {
				matches.push({field : field});
			}
		});
	});
	return matches;
}

function matchLabel(pattern: string, label: string) : boolean {
	return label && label.indexOf(pattern) != -1;
}

