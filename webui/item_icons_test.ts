import Q = require('q');
import react = require('react');
import react_addons = require('react/addons');

import collectionutil = require('../lib/base/collectionutil');
import event_stream = require('../lib/base/event_stream');
import item_icons = require('./item_icons');
import key_value_store = require('../lib/base/key_value_store');
import site_info = require('../lib/siteinfo/site_info');
import stringutil = require('../lib/base/stringutil');
import testLib = require('../lib/test');
import ui_test_utils = require('./test_utils');

var reactTestUtils = react_addons.addons.TestUtils;

function findDOMElement<T extends HTMLElement>(component: react.Component<{}, {}>, tagname: string) {
	return <T>react.findDOMNode(reactTestUtils.findRenderedDOMComponentWithTag(component, tagname));
}

testLib.addTest('should display site icon', (assert) => {
	ui_test_utils.runReactTest((element) => {
		var iconProvider = new item_icons.FakeIconProvider();
		var itemLocation = 'https://www.icloud.com';

		var iconComponent = react.render(item_icons.IconControlF({
			location: itemLocation,
			iconProvider: iconProvider,
			isFocused: false,
			onClick: () => { }
		}), element);
		var iconImage = findDOMElement<HTMLImageElement>(iconComponent, 'img');

		var testIconUrl = 'https://www.mysite.com/icon.png';
		iconProvider.addIcon(itemLocation, {
			iconUrl: testIconUrl,
			state: item_icons.IconFetchState.Found,
			width: 48,
			height: 48
		});

		iconComponent = react.render(item_icons.IconControlF({
			location: itemLocation,
			iconProvider: iconProvider,
			isFocused: false,
			onClick: () => { }
		}), element);
		iconImage = findDOMElement<HTMLImageElement>(iconComponent, 'img');
		assert.equal(iconImage.getAttribute('src'), testIconUrl);
	});
});

class FakeObjectStore implements key_value_store.ObjectStore {
	map: Map<string, any>;

	constructor() {
		this.map = new Map<string, any>();
	}

	set<T>(key: string, value: T) {
		this.map.set(key, value);
		return Q<void>(null);
	}

	get<T>(key: string) {
		return Q(this.map.get(key));
	}

	remove(key: string) {
		this.map.delete(key);
		return Q<void>(null);
	}

	list(prefix?: string) {
		return Q(collectionutil.keys(this.map).filter(key => {
			return !prefix || stringutil.startsWith(key, prefix);
		}));
	}
}

class FakeIconSource implements site_info.SiteInfoProvider {
	updated: event_stream.EventStream<string>;

	icons: Map<string, site_info.QueryResult>;
	queries: string[];

	private doLookup: (url: string) => site_info.QueryResult;

	constructor(doLookup: (url: string) => site_info.QueryResult) {
		this.updated = new event_stream.EventStream<string>();
		this.icons = new Map<string, site_info.QueryResult>();
		this.doLookup = doLookup;
		this.queries = [];
	}

	lookup(url: string) {
		this.queries.push(url);

		let result = this.status(url);

		if (!this.icons.has(url)) {
			// begin async icon fetch
			setTimeout(() => {
				this.icons.set(url, this.doLookup(url));
				this.updated.publish(url);
			}, 1);
		}

		return result;
	}

	status(url: string) {
		let result = this.icons.get(url);
		if (!result) {
			result = {
				info: { url: url, icons: [] },
				state: site_info.QueryState.Updating
			}
		}
		return result;
	}

	forget(url: string) {
		this.icons.delete(url);
	}
}

// returns a promise for data in the next event of
// an event stream
function await<T>(stream: event_stream.EventStream<T>): Q.Promise<T> {
	let done = Q.defer<T>();
	let listener = stream.listen(result => {
		done.resolve(result);
		stream.ignore(listener);
	});
	return done.promise;
}

// BasicIconProvider tests
testLib.addTest('should fetch and cache successful lookup', assert => {
	const ICON_SIZE = 32;
	const TEST_FOUND_URL = 'https://www.google.com';
	const BLOB_ICON_URL = 'blob://icon-blob-url';

	let cache = new FakeObjectStore();
	let imageLoader: item_icons.ImageLoader = data => BLOB_ICON_URL;

	let iconSource = new FakeIconSource(url => {
		return {
			info: {
				url: url,
				icons: [{
					url: 'https://iconprovider.com/icon.png',
					width: ICON_SIZE,
					height: ICON_SIZE,
					data: new Uint8Array([])
				}]
			},
			state: site_info.QueryState.Ready
		};
	});
	let iconProvider = new item_icons.BasicIconProvider(cache, iconSource, ICON_SIZE, imageLoader);

	// query for a site icon, check that the icon is initially
	// not available
	let icon = iconProvider.query(TEST_FOUND_URL);
	assert.equal(icon.state, item_icons.IconFetchState.Fetching);

	// wait for an update signalling that an icon is available
	// for the site
	return await(iconProvider.updated).then(url => {
		assert.equal(url, TEST_FOUND_URL);

		// check that the right icon was returned
		let icon = iconProvider.query(url);
		assert.equal(icon.iconUrl, BLOB_ICON_URL);
		assert.equal(icon.width, ICON_SIZE);
		assert.equal(icon.height, ICON_SIZE);

		// verify that the cache was populated.
		// Note that the cache key that happens to be
		// used is not necessarily the same as the URL
		// for which an icon was sought
		assert.equal(cache.map.size, 1);
		assert.deepEqual(iconSource.queries, [url]);

		// check that if we query for the icon again,
		// no further lookup is performed
		let icon2 = iconProvider.query(TEST_FOUND_URL);
		assert.deepEqual(iconSource.queries, [url]);
		assert.deepEqual(icon, icon2);
	});
});

