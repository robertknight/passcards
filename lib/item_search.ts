/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/URIjs.d.ts" />

import underscore = require('underscore');
import urijs = require('URIjs');

import onepass = require('./onepass');
import stringutil = require('./base/stringutil');

export class FieldMatch {
	url : onepass.ItemUrl;
	field : onepass.ItemField;
	formField : onepass.WebFormField;

	static fromURL(url: onepass.ItemUrl) : FieldMatch {
		var match = new FieldMatch;
		match.url = url;
		return match;
	}

	static fromField(field: onepass.ItemField) : FieldMatch {
		var match = new FieldMatch;
		match.field = field;
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

// Returns the part of a URL before the query string
function stripQuery(url: string) : string {
	var queryOffset = url.indexOf('?');
	var strippedUrl : string;
	if (queryOffset != -1) {
		strippedUrl = url.slice(0, queryOffset);
	} else {
		strippedUrl = url;
	}
	while (stringutil.endsWith(strippedUrl, '/')) {
		strippedUrl = strippedUrl.slice(0, strippedUrl.length - 1);
	}
	return strippedUrl;
}

/** Returns a score indicating the relevance of an item to a URL.
  * A positive (> 0) score indicates some relevance. A zero or negative
  * score indicates no match.
  */
export function itemUrlScore(item: onepass.Item, url: string) {
	if (url.indexOf(':') == -1) {
		// assume HTTPS if URL is lacking a scheme
		url = 'https://' + url;
	}

	var itemUrl = stripQuery(item.location);
	url = stripQuery(url);

	// exact match
	if (itemUrl.length > 0 &&
	    itemUrl == url) {
		return 1;
	}

	// full authority match
	var parsedItemUrl = urijs(itemUrl);
	var parsedUrl = urijs(url);

	if (parsedItemUrl.authority().length > 0 &&
	    parsedItemUrl.authority() == parsedUrl.authority()) {
		return 0.8;
	}

	// primary domain match
	if (parsedItemUrl.domain().length > 0 &&
	    parsedItemUrl.domain() == parsedUrl.domain()) {
		return 0.5;
	}

	return 0;
}

/** Returns a ranked list of items which may match a given URL. */
export function filterItemsByUrl(items: onepass.Item[], url: string) : onepass.Item[] {
	var matches = underscore.filter(items, (item) => {
		return itemUrlScore(item, url) > 0;
	});
	matches.sort((a, b) => {
		return itemUrlScore(b, url) - itemUrlScore(a, url);
	});
	return matches;
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
				matches.push(FieldMatch.fromField(field));
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
	return label && label.indexOf(pattern) != -1;
}

