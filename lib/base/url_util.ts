import uri_js = require('urijs');

import stringutil = require('./stringutil');

export interface ParamsDict {
    [key: string]: string;
}

// splits a 'key=value' pair into a [key, value]
// array. The 'value' part may contain '=' chars.
function splitHashParam(param: string): [string, string] {
    let separator = param.indexOf('=');
    if (separator === -1) {
        return [param, ''];
    } else {
        return [param.slice(0, separator), param.slice(separator + 1)];
    }
}

export function parseHash(hash: string): ParamsDict {
    return hash
        .slice(1) // trim leading '#'
        .split('&')
        .map(splitHashParam)
        .reduce((obj: ParamsDict, [key, value]: [string, string]) => {
            // the Dropbox OAuth endpoint will URI encode any chars in the
            // 'state' query string parameter passed to the OAuth /authorize
            // endpoint, so decode them here
            obj[key] = decodeURIComponent(value);
            return obj;
        }, <ParamsDict>{});
}

// Returns the part of a URL before the query string
export function stripQuery(url: string): string {
    var queryOffset = url.indexOf('?');
    var strippedUrl: string;
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
export function normalize(url: string): string {
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
export function domain(url: string): string {
    if (!url) {
        return '';
    }
    var schemePos = url.indexOf('://');
    if (schemePos == -1) {
        return '';
    }
    var hostStart = schemePos + 3;
    var hostEnd = url.indexOf('/', hostStart);
    if (hostEnd == -1) {
        hostEnd = url.length;
    }
    return url.slice(hostStart, hostEnd);
}

/** Returns the top-level domain for an item.
  * eg. 'https://www.google.com' -> 'google.com'
  */
export function topLevelDomain(url: string) {
    return uri_js(url).domain();
}
