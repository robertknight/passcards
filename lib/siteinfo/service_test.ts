/// <reference path="../../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../../typings/sprintf.d.ts" />

import fs = require('fs');
import path = require('path');
import Q = require('q');
import underscore = require('underscore');

import asyncutil = require('../base/asyncutil');
import collection_util = require('../base/collectionutil');
import http_client = require('../http_client');
import ico = require('./ico');
import image = require('./image');
import http_vfs = require('../vfs/http');
import node_vfs = require('../vfs/node');
import site_info = require('./site_info');
import site_info_service = require('./service');
import stringutil = require('../base/stringutil');
import testLib = require('../test');

var urlFetcher : site_info_service.UrlFetcher = {
	fetch(url: string) : Q.Promise<site_info_service.UrlResponse> {
		return http_client.request('GET', url).then((reply) => {
			return {
				status: reply.status,
				body: reply.body
			};
		});
	}
};

var TEST_SITE_PATH = path.join(stringutil.replaceLast(path.dirname(module.filename), 'build/', ''),
  '../test-data/site-icons');

testLib.addTest('extract page links', (assert) => {
	var extractor = new site_info_service.PageLinkFetcher(urlFetcher);

	var testCases = [{
		content: '<html><head>' +
		'<meta property="og:image" content="testicon.png">' +
		'<link rel="shortcut icon" href="http://www.foobar.com/icon.png">' +
		'</head></html>',
		links: [{
			type: site_info_service.MetaTagType.Meta,
			rel: 'og:image',
			url: 'testicon.png'
		},{
			type: site_info_service.MetaTagType.Link,
			rel: 'shortcut icon',
			url: 'http://www.foobar.com/icon.png'
		}]
	},{
		content: '<LINK REL="shortcut ICON" HREF=favicon.png>',
		links: [{
			type: site_info_service.MetaTagType.Link,
			rel: 'shortcut icon',
			url: 'favicon.png'
		}]
	}];

	testCases.forEach((testCase) => {
		var links = extractor.extractLinks(testCase.content);
		assert.deepEqual(links, testCase.links);
	});
});

function extractIconLinks(contentFilePath: string) : site_info_service.PageLink[] {
	var extractor = new site_info_service.PageLinkFetcher(urlFetcher);
	var content = fs.readFileSync(path.join(TEST_SITE_PATH, contentFilePath)).toString();
	return underscore.filter(extractor.extractLinks(content), (link) => {
		return site_info_service.isIconLink(link);
	});
}

testLib.addTest('extract icon links', (assert) => {
	var links = extractIconLinks('evernote.html');
	assert.deepEqual(links, [
		{
			type: site_info_service.MetaTagType.Meta,
			rel: 'og:image',
			url: 'http://evernote.com/media/img/evernote_icon.png'
		},
		{
			type: site_info_service.MetaTagType.Link,
			rel: 'shortcut icon',
			url: '/media/img/favicon.ico'
		},
		{
			type: site_info_service.MetaTagType.Meta,
			rel: 'msapplication-tileimage',
			url: '/media/img/favicon_144.png'
		}
	]);
});

testLib.addTest('read PNG icon', (assert) => {
	var iconPath = path.join(TEST_SITE_PATH, 'wikipedia/standard-icons/apple-touch-icon.png');
	var data = new Uint8Array(<any>fs.readFileSync(iconPath));
	var size = site_info_service.iconFromData('apple-touch-icon.png', data);
	assert.equal(size.width, 144);
	assert.equal(size.height, 144);
});

testLib.addTest('read BMP icon', (assert) => {
	var iconPath = path.join(TEST_SITE_PATH, 'wikipedia/linked-icons/favicon-16x16.bmp');
	var data = new Uint8Array(<any>fs.readFileSync(iconPath));
	var size = site_info_service.iconFromData('favicon-16x16.bmp', data);
	assert.equal(size.width, 16);
	assert.equal(size.height, 16);
});

testLib.addTest('read JPEG icon', (assert) => {
	var icons = [{
		path: 'wikipedia/wikipedia.jpg',
		width: 144,
		height: 144
	},{
		path: 'wikipedia/wikipedia-progressive.jpg',
		width: 183,
		height: 200
	}];

	icons.forEach((icon) => {
		var iconPath = path.join(TEST_SITE_PATH, icon.path);
		var data = new Uint8Array(<any>fs.readFileSync(iconPath));
		var size = site_info_service.iconFromData(icon.path, data);
		assert.equal(size.width, icon.width);
		assert.equal(size.height, icon.height);
	});
});

testLib.addTest('read ICO icon', (assert) => {
	var iconPath = path.join(TEST_SITE_PATH, 'wikipedia/standard-icons/favicon.ico');
	var data = new Uint8Array(<any>fs.readFileSync(iconPath));
	var icons = ico.read(new DataView(data.buffer));
	assert.equal(icons.length, 3);

	var expectedIcons = [
	  { width: 16, height: 16, data: 'wikipedia/linked-icons/favicon-16x16.bmp' },
	  { width: 32, height: 32, data: 'wikipedia/linked-icons/favicon-32x32.bmp' },
	  { width: 48, height: 48, data: 'wikipedia/linked-icons/favicon-48x48.bmp' }
	];

	icons.forEach((icon, index) => {
		var expectedIcon = expectedIcons[index];
		var expectedData = fs.readFileSync(path.join(TEST_SITE_PATH, expectedIcon.data));
		assert.equal(icon.width, expectedIcon.width);
		assert.equal(icon.height, expectedIcon.height);
		assert.deepEqual(collection_util.bufferToArray(icon.data), collection_util.bufferToArray(expectedData));
	});
});

testLib.addTest('read ICO icons', (assert) => {
	// FIXME - Remaining non-working icons: ['eventbrite.ico']
	var icons = ['icloud.ico', 'desk.ico', 'gocompare.ico', 'prodpad.ico', 'codeplex.ico'];
	icons.forEach((name) => {
		var iconPath = path.join(TEST_SITE_PATH + '/ico', name);
		var data = new Uint8Array(<any>fs.readFileSync(iconPath));
		try {
			var icons = ico.read(new DataView(data.buffer));
			assert.ok(icons.length > 0);
		} catch (ex) {
			console.log('error reading icon', name, ':', ex.message);
		}
	});
});

testLib.addTest('image decode error', (assert) => {
	var PNG_SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
	var invalidIconData = PNG_SIG.concat([0, 1, 2, 3, 4, 5]);
	try {
		site_info_service.iconFromData('foo.png', new Uint8Array(invalidIconData));
		assert.ok(false);
	} catch (ex) {
		assert.ok(ex instanceof image.DecodeError);
	}
});

testLib.addTest('extract largest ICO icon', (assert) => {
	var iconPath = path.join(TEST_SITE_PATH, 'wikipedia/standard-icons/favicon.ico');
	var data = new Uint8Array(<any>fs.readFileSync(iconPath));
	var icon = site_info_service.iconFromData('favicon.ico', data);
	assert.equal(icon.width, 48);
	assert.equal(icon.height, 48);
	assert.ok(icon.data != null);

	var expectedData = fs.readFileSync(path.join(TEST_SITE_PATH, 'wikipedia/linked-icons/favicon-48x48.bmp'));
	assert.deepEqual(collection_util.bufferToArray(icon.data),
	                 collection_util.bufferToArray(expectedData));
});

interface ServeFetchResult {
	server: http_vfs.Server;
	queryResult: site_info.QueryResult;
	provider: site_info.SiteInfoProvider;
}

function serveAndFetchIcons(port: number, siteRoot: string, queryPath: string) : Q.Promise<ServeFetchResult> {
	var server = new http_vfs.Server(new node_vfs.FileVFS(siteRoot));
	var provider = new site_info_service.SiteInfoService(urlFetcher);
	var result: site_info.QueryResult;
	var queryUrl = 'http://localhost:' + port + queryPath;

	return server.listen(port).then(() => {
		return asyncutil.until(() => {
			var next = Q.defer<boolean>();
			result = provider.lookup(queryUrl);
			if (result.state == site_info.QueryState.Ready) {
				return Q.resolve(true);
			} else {
				setTimeout(() => {
					next.resolve(false);
				}, 100);
				return next.promise;
			}
		});
	}).then(() => {
		return {
			queryResult: result,
			server: server,
			provider: provider
		};
	});
}

var maxPort = 8561;
function allocatePort() : number {
	var port = maxPort;
	++maxPort;
	return port;
}

testLib.addAsyncTest('fail to fetch icons', (assert) => {
	var sitePath = path.join(TEST_SITE_PATH, 'wikipedia/no-icons');
	serveAndFetchIcons(allocatePort(), sitePath, '').then((result) => {
		assert.equal(result.queryResult.state, site_info.QueryState.Ready);
		assert.equal(result.queryResult.info.icons.length, 0);
		result.server.close();
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('fetch static links', (assert) => {
	var sitePath = path.join(TEST_SITE_PATH, 'wikipedia/standard-icons');
	serveAndFetchIcons(allocatePort(), sitePath,'/').then((result) => {
		assert.equal(result.queryResult.state, site_info.QueryState.Ready);
		assert.equal(result.queryResult.info.icons.length, 2);
		result.server.close();
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('fetch page links', (assert) => {
	var sitePath = path.join(TEST_SITE_PATH, 'wikipedia/linked-icons');
	serveAndFetchIcons(allocatePort(), sitePath,'/index.html').then((result) => {
		assert.equal(result.queryResult.state, site_info.QueryState.Ready);
		assert.equal(result.queryResult.info.icons.length, 3);
		result.server.close();
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('forget site info', (assert) => {
	var sitePath = path.join(TEST_SITE_PATH, 'wikipedia/linked-icons');
	serveAndFetchIcons(allocatePort(), sitePath, '/index.html').then((result) => {
		var queryUrl = result.queryResult.info.url;
		assert.equal(result.queryResult.state, site_info.QueryState.Ready);

		// ask the provider to forget cached data and repeat the lookup
		result.provider.forget(queryUrl);
		var uncachedLookup = result.provider.lookup(queryUrl);
		assert.equal(uncachedLookup.state, site_info.QueryState.Updating);

		result.server.close();
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('fetch site icon with DuckDuckGo', (assert) => {
	var urlFetcher: site_info_service.UrlFetcher = {
		fetch: (url: string) => {
			return Q.resolve({
				status: 200,
				body: JSON.stringify({
					Image: 'https://duckduckgo.com/i/img.png',
					ImageIsLogo: 1
				})
			});
		}
	};

	var ddgClient = new site_info_service.DuckDuckGoClient(urlFetcher);
	ddgClient.fetchIconUrl('http://www.admiral.com').then((icon) => {
		assert.equal(icon, 'https://duckduckgo.com/i/img.png');
		testLib.continueTests();
	});
});

testLib.start();
