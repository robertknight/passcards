/// <reference path="../../typings/URIjs.d.ts" />

import uri_js = require('URIjs');
import urlLib = require('url');

import stringutil = require('./stringutil');

// Returns the part of a URL before the query string
export function stripQuery(url: string) : string {
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

/** Strips the query string from a URL string and
 * prefixes an HTTPS scheme if none is set.
 *
 * Returns an empty string if the input is empty.
 */
export function normalize(url: string) : string {
	url = url.trim();
	if (url.length == 0) {
		return '';
	}

	if (url.indexOf(':') == -1) {
		// assume HTTPS if URL is lacking a scheme
		url = 'https://' + url;
	}
	return stripQuery(url);
}

/** Returns the domain from a URL or an empty string
  * if @p url does not contain a host.
  */
export function domain(url: string) : string {
	if (!url) {
		return '';
	}
	var parsedUrl = urlLib.parse(url);
	return parsedUrl.host;
}

/** Returns the top-level domain for an item.
  * eg. 'https://www.google.com' -> 'google.com'
  */
export function topLevelDomain(url: string) {
	return uri_js(url).domain();
}

