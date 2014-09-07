/// <reference path="../../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../../typings/DefinitelyTyped/underscore/underscore.d.ts" />

// This module implements a website icon/info provider which
// fetches icon details and data from an instance of the
// Passcards site info service (https://github.com/robertknight/passcards-siteinfo-server)

import Q = require('q');
import underscore = require('underscore');
import urlLib = require('url');

import asyncutil = require('../base/asyncutil');
import client_api = require('./client_api');
import collectionutil = require('../base/collectionutil')
import event_stream = require('../base/event_stream');
import http_client = require('../http_client');
import site_info = require('./site_info');

export var DEFAULT_PASSCARDS_SERVICE_URL = 'https://passcards-robknight.rhcloud.com';

export class PasscardsClient implements site_info.SiteInfoProvider {
	private cache: Map<string,site_info.QueryResult>;
	private rootUrl: string;

	updated: event_stream.EventStream<string>;

	constructor(serviceHost: string = DEFAULT_PASSCARDS_SERVICE_URL) {
		this.cache = new collectionutil.PMap<string,site_info.QueryResult>();
		this.rootUrl = serviceHost;
		this.updated = new event_stream.EventStream<string>();
	}

	lookup(url: string) : site_info.QueryResult {
		var domain = this.domainForUrl(url);
		if (!domain) {
			return <site_info.QueryResult>{
				info: {
					url: url,
					icons: []
				},
				state: site_info.QueryState.Ready
			};
		}

		var queryResult = this.cache.get(domain);
		if (queryResult) {
			return queryResult;
		}
		queryResult = {
			info: {
				url: url,
				icons: []
			},
			state: site_info.QueryState.Updating
		};
		this.cache.set(domain, queryResult);

		this.queryDomainInfo(domain).then((response) => {
			var selectedIcons: client_api.LookupResponseIcon[] = [];
			if (response) {
				selectedIcons = response.icons;
			}

			var MIN_ICON_SIZE = 32;
			var MAX_ICON_SIZE = 512;

			selectedIcons = underscore.filter(selectedIcons, (icon) => {
				return icon.width >= MIN_ICON_SIZE && icon.width <= MAX_ICON_SIZE &&
				       icon.height >= MIN_ICON_SIZE && icon.height <= MAX_ICON_SIZE;
			});

			if (selectedIcons.length == 0) {
				this.cache.get(domain).state = site_info.QueryState.Ready;
				this.updated.publish(url);
				return;
			}

			var pendingIcons = selectedIcons.length;
			selectedIcons.forEach((icon) => {
				http_client.get(this.rootUrl + icon.dataUrl).then((reply) => {
					var entry = this.cache.get(domain);
					if (reply.status == 200) {
						entry.info.icons.push({
							url: icon.sourceUrl,
							width: icon.width,
							height: icon.height,
							data: collectionutil.bufferFromString(reply.body)
						});
					} else {
						console.log('fetching icon %s from site info service failed: %d', icon.sourceUrl, reply.status);
					}
					--pendingIcons;
					if (pendingIcons == 0) {
						entry.state = site_info.QueryState.Ready;
					}
					this.updated.publish(url);
				}).done();
			});
		}).done();

		return queryResult;
	}

	status(url: string) {
		return this.cache.get(this.domainForUrl(url));
	}

	forget(url: string) {
		this.cache.delete(url);
	}

	private queryDomainInfo(domain: string) : Q.Promise<client_api.LookupResponse> {
		var response: client_api.LookupResponse;
		return asyncutil.until(() => {
			return http_client.get(this.rootUrl + '/siteinfo/' + domain).then((reply) => {
				if (reply.status != 200) {
					console.log('siteinfo service query for %s failed: %d %s', domain, reply.status, reply.body);
					return Q(true);
				} else {
					response = <client_api.LookupResponse>(JSON.parse(reply.body));
					if (response.status != 'processing') {
						return Q(true);
					} else {
						// wait and poll again shortly
						return Q.delay(false, 500);
					}
				}
			});
		}).then(() => {
			return response;
		});
	}

	private domainForUrl(url: string) {
		var parsedUrl = urlLib.parse(url);
		return parsedUrl.host;
	}
}
