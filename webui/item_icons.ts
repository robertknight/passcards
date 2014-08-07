/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/URIjs.d.ts" />

import underscore = require('underscore');
import urijs = require('URIjs');

import event_stream = require('../lib/base/event_stream');
import site_info = require('../lib/siteinfo/site_info');
import url_util = require('../lib/base/url_util');

/** Fetch state for an icon returned by ItemIconProvider query.
  */
export enum IconFetchState {
	Fetching, ///< Icons associated with the URL are currently being fetched
	NoIcon, ///< The fetch completed but no matching icon was found
	Found ///< The fetch completed and found an icon
}

export interface ItemIcon {
	iconUrl: string;
	state: IconFetchState;
}

/** Provides icon URLs for items.
  *
  * Call query(url) to lookup the icon associated with a given URL.
  * If a cached icon is available, it will be returned, otherwise a lookup
  * will be triggered.
  *
  * When the icon associated with a previously looked up URL changes,
  * the updated event stream will emit the normalized URL.
  */
export class ItemIconProvider {
	private cache: {
		[index: string] : ItemIcon;
	};
	private provider: site_info.SiteInfoProvider;
	private iconSize: number;

	/** Stream of icon update events.
	  * Emits the normalized URL (using url_util.normalize) of the location
	  * when the icon for that location is updated.
	  */
	updated: event_stream.EventStream<string>;
	
	/** Create an icon provider which uses @p provider to fetch
	  * icon data. @p iconSize specifies the size of icon to make from
	  * the available icons for a given URL.
	  */
	constructor(provider: site_info.SiteInfoProvider, iconSize: number) {
		this.cache = {};
		this.provider = provider;
		this.iconSize = iconSize;
		this.updated = new event_stream.EventStream<string>();

		this.provider.updated.listen((url) => {
			var entry = this.provider.status(url);
			var isReady = entry.state == site_info.QueryState.Ready;

			console.log('ItemIconProvider.constructor', 'received icon update for', url, 'is ready?', isReady);
			if (entry.state == site_info.QueryState.Ready) {
				var icon = this.cache[url];
				icon.iconUrl = this.makeIconUrl(entry.info.icons, this.iconSize);
				if (icon.iconUrl != '') {
					icon.state = IconFetchState.Found;
				} else {
					icon.state = IconFetchState.NoIcon;
				}
				this.updated.publish(url);

				if (entry.info.icons.length == 0) {
					// if a query against the actual location returns no suitable icons,
					// try a query against the main domain
					var fallbackUrl = this.fallbackUrlForIcon(url);
					if (fallbackUrl && fallbackUrl != url) {
						this.query(this.fallbackUrlForIcon(url));
					}
				}

				// free icon data
				this.provider.forget(url);
			}
		});
	}

	/** Returns true if a given @p updateUrl from ItemIconProvider.updated
	  * matches an item with location @p location.
	  *
	  * The update URL may not match the original item location due to
	  * normalization or if a fallback URL has been used to find
	  * an icon for the item.
	  */
	updateMatches(updateUrl: string, itemUrl: string) {
		itemUrl = url_util.normalize(itemUrl);
		return updateUrl == itemUrl ||
		       updateUrl == this.fallbackUrlForIcon(itemUrl);
	}

	/** Fetch the icon for a given URL. */
	query(url: string) : ItemIcon {
		url = url_util.normalize(url);

		if (url.length == 0) {
			return {
				iconUrl: 'loading.png',
				state: IconFetchState.NoIcon
			}
		}

		if (this.cache.hasOwnProperty(url)) {
			var cachedIcon = this.cache[url];
			if (cachedIcon.state == IconFetchState.NoIcon) {
				var fallbackUrl = this.fallbackUrlForIcon(url);
				if (this.cache.hasOwnProperty(fallbackUrl)) {
					return this.cache[fallbackUrl];
				}
			}
			return cachedIcon;
		} else {
			console.log('ItemIconProvider.query', 'new icon request', url);
			var icon : ItemIcon = {
				iconUrl: 'loading.png',
				state: IconFetchState.Fetching
			};
			this.cache[url] = icon;
			
			this.provider.lookup(url);

			return icon;
		}
	}

	// Take a set of icons for a site, pick the best one for a given target
	// image width of @p minSize and return a blob URL for the image
	// data
	private makeIconUrl(icons: site_info.Icon[], minSize: number) {
		if (icons.length == 0) {
			return '';
		}

		var iconsBySize = underscore.sortBy(icons, (icon) => {
			return icon.width;
		});

		// try to find a square icon of the required-size
		var squareIcon: site_info.Icon;
		var nonSquareIcon: site_info.Icon;

		for (var i=0; i < iconsBySize.length; i++) {
			var candidate = iconsBySize[i];
			if (candidate.width >= minSize) {
				if (candidate.width == candidate.height) {
					squareIcon = squareIcon || candidate;
				} else {
					nonSquareIcon = nonSquareIcon || candidate;
				}
			}
		}

		var icon = squareIcon || nonSquareIcon;
		if (!icon) {
			icon = iconsBySize[iconsBySize.length-1];
		}
		
		// FIXME - TypeScript ctor for Blob
		// is missing arguments
		var blobObject: any = Blob;
		var iconBlob = new blobObject([icon.data]);
		var blobUrl = (<any>URL).createObjectURL(iconBlob);

		return blobUrl;
	}

	// Returns a fallback URL to try if querying an item's URL does
	// not return an icon.
	//
	// (eg. 'https://sub.domain.com/foo/bar' => 'https://www.domain.com')
	//
	// We use HTTPS here although there are many sites which do have secure
	// login pages but whoose main site is not reachable over HTTPS
	// due to an invalid certificate or simply lack of SSL support.
	//
	// We could try an HTTP-only variant of the lookup but this is open
	// to MITM spoofing if run from the user's system.
	//
	private fallbackUrlForIcon(url: string) {
		url = url_util.normalize(url);
		var parsedUrl = urijs(url);
		return 'https://www.' + parsedUrl.domain();
	}
}

