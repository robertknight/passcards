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

// strips the query string from a URL string and
// prefixes an HTTPS scheme if none is set
export function normalize(url: string) : string {
	if (url.indexOf(':') == -1) {
		// assume HTTPS if URL is lacking a scheme
		url = 'https://' + url;
	}
	return stripQuery(url);
}

