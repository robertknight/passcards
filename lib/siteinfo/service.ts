/// <reference path="../../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../../typings/URIjs.d.ts" />

import Q = require('q');
import underscore = require('underscore');
import urijs = require('URIjs');

import collection_util = require('../base/collectionutil');
import event_stream = require('../base/event_stream');
import err_util = require('../base/err_util');
import ico = require('./ico');
import image = require('./image');
import site_info = require('./site_info');
import stringutil = require('../base/stringutil');
import url_util = require('../base/url_util');

// Icon Sources:
//  - Static URls at $HOST/$ICON_NAME (Favicon, Apple Touch Icon etc.)
//  - Image URLs referenced from page in <meta> or <link> tags (eg. Favicon, Apple touch icons,
//    Facebook, Twitter and Schema.org URLs)
//  - HTML URLs referenced from page in <meta> or <link> tags which
//    require icons (eg. Apple iTunes pages, Social media pages, Twitter accounts)
//  - DuckDuckGo instant answer API query for '<domain name minus tld>'

// App and Social Media Links:
//
// Google+ link:
//  <link href="https://plus.google.com/<ID>" rel="publisher" />
//  G+ pages have schema.org <meta ...imageprop> tags on them
//
// App links:
//  <meta name="apple-itunes-app" content="app-id=$APP_ID" />
//    -- iTunes store pages have Facebook OpenGraph <meta> tags on them
//  <meta property="fb:app_id" content="$APP_ID" />
//
// Image tags:
//  <img> tags on page containing keywords such as 'icon' or 'logo'
//
// RSS links:
//  <link rel="alternate" type="application/rss+xml"  title="Latest News" href="/rss/rss.xml" />
//  RSS XML format has image/url tag.

// list of known <link> and <meta> tags that point
// to an icon for the site.
//
// See also: 
// - http://www.iacquire.com/blog/18-meta-tags-every-webpage-should-have-in-2013
// - Google structured data testing tool: http://www.google.com/webmasters/tools/richsnippets
// 
var ICON_LINK_TYPES : PageLink[] = [
  // Favicons
  { type: MetaTagType.Link, rel: 'icon' },
  { type: MetaTagType.Link, rel: 'shortcut icon' },

  // iOS hi-DPI site icons
  { type: MetaTagType.Link, rel: 'apple-touch-icon' },
  { type: MetaTagType.Link, rel: 'apple-touch-icon-precomposed' },

  // Facebook OpenGraph (http://developers.facebook.com/docs/opengraphprotocol/)
  { type: MetaTagType.Meta, rel: 'og:image' },

  // Twitter Cards (https://dev.twitter.com/docs/cards)
  { type: MetaTagType.Meta, rel: 'twitter:image' },
  { type: MetaTagType.Meta, rel: 'twitter:image:src' },

  // Schema.org
  { type: MetaTagType.Meta, rel: 'image' },

  // Other
  { type: MetaTagType.Meta, rel: 'msapplication-TileImage' }
];

export enum MetaTagType {
	Meta,
	Link
}

export interface UrlResponse {
	status: number;
	body: string;
}

/** Interface used by SiteInfoService service for fetching arbitrary URLs.
  */
export interface UrlFetcher {
	fetch(url: string) : Q.Promise<UrlResponse>;
}

/** Determines the type and width/height of an icon fetched from
  * a URL and returns an Icon object.
  *
  * If @p data is in .ico format, the largest icon in the file
  * is returned and the data in the returned Icon.data field
  * will be in .bmp format.
  */
export function iconFromData(url: string, buffer: Uint8Array) : site_info.Icon {
	var data = new Uint8Array(<any>buffer);
	if (ico.isIco(data)) {
		var maxIcon = underscore.max(ico.read(new DataView(data.buffer)), (icon: ico.Icon) => {
			return icon.width;
		});

		return {
			url: url,
			width: maxIcon.width,
			height: maxIcon.height,
			data: maxIcon.data
		};
	} else {
		var imageInfo = image.getInfo(buffer);
		if (!imageInfo) {
			return null;
		}

		return {
			url: url,
			width: imageInfo.width,
			height: imageInfo.height,
			data: data
		};
	}
}

interface IconFetchState {
	url: string;
	reply: Q.Promise<UrlResponse>;
	icon: site_info.Icon;
	status: number;
}

class IconFetcher {
	private fetcher: UrlFetcher;
	private queue : IconFetchState[];

	done: event_stream.EventStream<IconFetchState>;

	constructor(fetcher: UrlFetcher) {
		this.fetcher = fetcher;
		this.done = new event_stream.EventStream<IconFetchState>();
		this.queue = [];
	}

	remaining() : number {
		return this.queue.length;
	}

	addUrl(url: string) {
		var queueItem : IconFetchState = {
			url: url,
			icon: null,
			reply: this.fetcher.fetch(url),
			status: null
		};
		
		this.queue.push(queueItem);

		queueItem.reply.then((reply) => {
			queueItem.status = reply.status;
			if (reply.status == 200) {
				var buffer = collection_util.bufferFromString(reply.body);
				try {
					queueItem.icon = iconFromData(url, buffer);
				} catch (ex) {
					var start = collection_util.hexlify(buffer.subarray(0,50));
					console.log('Failed to decode icon', url, 'from data of length', buffer.length, start);
				}
			}
		}).fail((e) => {
			queueItem.status = 0;
		}).finally(() => {
			this.queue.splice(this.queue.indexOf(queueItem, 1));
			this.done.publish(queueItem);
		});
	}
}

/** Returns true if a <meta> or <link> element on a page
  * links to an icon or image for the page or parent domain.
  */
export function isIconLink(link: PageLink) : boolean {
	var isIcon = false;
	ICON_LINK_TYPES.forEach((linkType) => {
		if (linkType.type === link.type &&
			stringutil.equalIgnoreCase(linkType.rel,link.rel)) {
			isIcon = true;
		}
	});
	return isIcon;
}

export class SiteInfoService implements site_info.SiteInfoProvider {
	private cache: collection_util.OMap<site_info.QueryResult>;

	updated: event_stream.EventStream<string>;

	constructor(public fetcher: UrlFetcher) {
		this.cache = {};
		this.updated = new event_stream.EventStream<string>();
	}

	forget(url: string) {
		url = url_util.normalize(url);
		delete this.cache[url];
	}

	lookup(url: string) : site_info.QueryResult {
		url = url_util.normalize(url);

		if (this.cache[url]) {
			return this.cache[url];
		}

		var result : site_info.QueryResult = {
			info : {
				url: url,
				iconUrl: null,
				icons: []
			},
			state : site_info.QueryState.Updating
		};

		this.cache[url] = result;
		this.update(url);

		return this.status(url);
	}

	status(url: string) : site_info.QueryResult {
		url = url_util.normalize(url);
		return this.cache[url];
	}

	update(url: string) {
		url = url_util.normalize(url);

		var SOURCE_COUNT = 2;
		var sourcesQueried = 0;

		var iconFetcher = new IconFetcher(this.fetcher);
		var updateQueryState = () => {
			if (iconFetcher.remaining() == 0 && sourcesQueried == SOURCE_COUNT) {
				this.cache[url].state = site_info.QueryState.Ready;
				this.updated.publish(url);
			}
		};

		iconFetcher.done.listen((result) => {
			if (result.status == 200) {
				if (result.icon) {
					this.cache[url].info.icons.push(result.icon);
				}
				this.updated.publish(url);
			}
			updateQueryState();
		});

		// check standard icon paths for host
		var STANDARD_PATHS: string[] = ['/favicon.ico',
		  '/apple-touch-icon.png',
		  '/apple-touch-icon-precomposed.png'
		];

		STANDARD_PATHS.forEach((path) => {
			var urlParts = urijs.parse(url);
			urlParts.path = path;
			iconFetcher.addUrl(urijs.build(urlParts));
		});
		++sourcesQueried;

		// fetch URL and look for links to icons in the HTML content
		var pageLinkFetcher = new PageLinkFetcher(this.fetcher);
		pageLinkFetcher.fetch(url).then((links) => {
			var rootUrl = url;
			links.forEach((link) => {
				if (isIconLink(link)) {
					var absoluteLinkUrl = urijs(link.url).absoluteTo(rootUrl);
					iconFetcher.addUrl(absoluteLinkUrl.toString());
				}
			});
		}).finally(() => {
			++sourcesQueried;
			updateQueryState();
		});
	}
}

/** Represents a link to a related resource listed in
  * an HTML page, eg. via a <meta> or <link> tag.
  */
export interface PageLink {
	type: MetaTagType;

	/** The relation of this resource to the page, specified
	  * via the 'rel' attribute of <link> tags or 'property',
	  * 'name', 'itemprop' etc. attributes of <meta> tags.
	  */
	rel: string;

	/** The URL of the linked resource, specified via the
	  * 'href' attribute of <link> tags or the 'content'
	  * attribute of <meta> tags.
	  */
	url?: string;
}

interface Token {
	start: number;
	length: number;
}

// holds the tag name and text of
// a parsed HTML tag
interface ParsedTag {
	type: string;
	attrs: collection_util.OMap<string>;
	text: string;
}

/** PageLinkFetcher retrieves an HTML page and
  * extracts links to related resources from <meta> and <link> tags
  */
export class PageLinkFetcher {
	constructor(public fetcher: UrlFetcher) {
	}

	extractLinks(content: string) : PageLink[] {
		var linkStart = /\<(link|meta)/i;
		var links: PageLink[] = [];

		while (true) {
			var match = content.match(linkStart);
			if (!match) {
				break;
			}

			var linkType: MetaTagType;
			var linkRel: string = '';
			var linkUrl: string = '';
			
			var tagStart = (<any>match).index;
			var tag = this.parseTag(content.substr(tagStart));
			content = content.substr(tagStart + tag.text.length);

			var propAttrs = ['rel', 'property', 'name', 'itemprop'];
			var urlAttrs = ['href', 'content'];

			if (tag.type == 'link') {
				linkType = MetaTagType.Link;
			} else {
				linkType = MetaTagType.Meta;
			}

			for (var i=0; i < propAttrs.length && !linkRel; i++) {
				var propName = propAttrs[i];
				if (tag.attrs[propName]) {
					for (var k=0; k < urlAttrs.length && !linkUrl; k++) {
						if (tag.attrs[urlAttrs[k]]) {
							linkRel = tag.attrs[propName];
							linkUrl = tag.attrs[urlAttrs[k]];
						}
					}
				}
			}

			if (linkType !== null && linkRel && linkUrl) {
				links.push({
					type: linkType,
					rel: linkRel.toLowerCase(),
					url: linkUrl
				});
			}
		}

		return links;
	}

	fetch(url: string) : Q.Promise<PageLink[]> {
		return this.fetcher.fetch(url).then((response) => {
			return this.extractLinks(response.body);
		});
	}

	private parseTag(content: string) : ParsedTag {
		var attrs: collection_util.OMap<string> = {};
		var tokens = this.tokenizeTag(content);
		var inVal = false;
		var attrName = '';
		var tagType = '';

		tokens.forEach((token) => {
			var text = this.unquote(content.substr(token.start, token.length));
			if (text == '<' || text == '>') {
				return;
			}
			if (!tagType) {
				tagType = text.toLowerCase();
				return;
			}

			if (text == '=') {
				inVal = true;
			} else if (inVal) {
				attrs[attrName] = text;
				inVal = false;
			} else {
				attrName = text.toLowerCase();
			}
		});

		var last = tokens[tokens.length-1];
		var parsed = {
			type: tagType,
			attrs: attrs,
			text: content.substr(tokens[0].start, last.start + last.length)
		};

		return parsed;
	}

	private unquote(text: string) : string {
		var quoteCh = text[0];
		if (quoteCh != '"' && quoteCh != '\'') {
			return text;
		}

		var unquoted = '';
		for (var i=1; i < text.length; i++) {
			if (text[i] == '\\') {
				unquoted += text[i+1];
				i += 2;
			} else if (text[i] == quoteCh) {
				break;
			} else {
				unquoted += text[i];
			}
		}

		return unquoted;
	}

	private tokenizeTag(content: string) : Token[] {
		var tagDepth = 0;
		var quoteChar: string = null;
		var prevCh: string = null;

		var tokens: Token[] = [];
		var tokenStart = 0;
		var next = (i: number) => {
			var length = i - tokenStart;
			var text = content.substr(tokenStart, length);

			if (!text.match(/^\s*$/)) {
				tokens.push({
					start: tokenStart,
					length: length
				});
			}
			
			tokenStart = i;
		};

		var i = 0;
		for (;i < content.length; i++) {
			var ch = content[i];
			if (quoteChar === null) {
				if (ch === '<') {
					++tagDepth;
					next(i);
				} else if (ch === '>') {
					--tagDepth;
					next(i);

					if (tagDepth == 0) {
						next(i+1);
						break;
					}
				} else if (ch === '"' || ch === '\'') {
					quoteChar = ch;
					next(i);
				} else if (ch === '=') {
					next(i);
				} else if (ch === ' ') {
					if (prevCh !== ' ') {
						next(i);
					}
				} else if (prevCh === ' ' || prevCh === '<' || prevCh === '=') {
					next(i);
				}
			} else if (ch === quoteChar) {
				if (prevCh !== '\\') {
					quoteChar = null;
					next(i+1);
				}
			}
			prevCh = ch;
		}

		return tokens;
	}
}

/** DuckDuckGo fetches an icon associated with a URL using
  * the DDG instant answer API
  */
export class DuckDuckGoClient {
	constructor(private fetcher: UrlFetcher) {
	}

	/** Fetch the URL for the icon associated with a given URL's
	  * domain.
	  */
	fetchIconUrl(url: string) : Q.Promise<string> {
		var itemDomain = urijs(url).domain();
		if (itemDomain.length > 0) {
			var ddgQuery = this.fetcher.fetch('https://api.duckduckgo.com/?q=' + itemDomain + '&format=json');
			return ddgQuery.then((result) => {
				if (result.status == 200) {
					var queryResult = JSON.parse(result.body);
					if (queryResult.Image && queryResult.ImageIsLogo) {
						return Q.resolve(queryResult.Image);
					} else {
						return Q.reject(new err_util.ApiError(url, result.status, 'DDG query did not return an icon'));
					}
				} else {
					Q.reject(new err_util.ApiError(url, result.status, 'DDG query failed'));
				}
			});
		} else {
			return Q.reject(new err_util.BaseError('Could not extract domain for URL: ' + url));
		}
	}
}

