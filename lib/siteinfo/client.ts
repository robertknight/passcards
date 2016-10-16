
// This module implements a website icon/info provider which
// fetches icon details and data from an instance of the
// Passcards site info service (https://github.com/robertknight/passcards-siteinfo-server)

import urlLib = require('url');

import client_api = require('./client_api');
import collectionutil = require('../base/collectionutil')
import event_stream = require('../base/event_stream');
import http_client = require('../http_client');
import site_info = require('./site_info');

export var DEFAULT_PASSCARDS_SERVICE_URL = 'https://passcards-robknight.rhcloud.com';

function createQueryResult(url: string, state: site_info.QueryState): site_info.QueryResult {
	return {
		info: {
			url: url,
			icons: <site_info.Icon[]>[]
		},
		state: state
	};
}

export class PasscardsClient implements site_info.SiteInfoProvider {
	private cache: Map<string, site_info.QueryResult>;
	private rootUrl: string;

	updated: event_stream.EventStream<string>;

	constructor(serviceHost: string = DEFAULT_PASSCARDS_SERVICE_URL) {
		this.cache = new Map<string, site_info.QueryResult>();
		this.rootUrl = serviceHost;
		this.updated = new event_stream.EventStream<string>();
	}

	lookup(url: string): site_info.QueryResult {
		let domain = this.domainForUrl(url);
		if (!domain) {
			return createQueryResult(url, site_info.QueryState.Ready);
		}

		let queryResult = this.cache.get(domain);
		if (queryResult) {
			return queryResult;
		}
		queryResult = createQueryResult(url, site_info.QueryState.Updating);
		this.cache.set(domain, queryResult);

		this.queryDomainInfo(domain).then(response => {
			let selectedIcons: client_api.LookupResponseIcon[] = [];
			if (response) {
				selectedIcons = response.icons;
			}

			const MIN_ICON_SIZE = 32;
			const MAX_ICON_SIZE = 512;

			selectedIcons = selectedIcons.filter(icon => {
				return icon.width >= MIN_ICON_SIZE && icon.width <= MAX_ICON_SIZE &&
					icon.height >= MIN_ICON_SIZE && icon.height <= MAX_ICON_SIZE;
			});

			let pendingIcons: Promise<void>[] = [];
			selectedIcons.forEach(icon => {
				let iconUrl = this.rootUrl + icon.dataUrl;
				pendingIcons.push(http_client.get(iconUrl).then(reply => {
					let entry = this.cache.get(domain);
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
				}));
			});
			Promise.all(pendingIcons).catch(() => { }).then(() => {
				let entry = this.cache.get(domain);
				entry.state = site_info.QueryState.Ready;
				this.updated.publish(url);
			});
		}).catch(err => {
			console.error('Failed to fetch icon', err.toString(), err.stack);
			let entry = this.cache.get(domain);
			entry.state = site_info.QueryState.Ready;
			this.updated.publish(url);
		});

		return queryResult;
	}

	status(url: string) {
		return this.cache.get(this.domainForUrl(url));
	}

	forget(url: string) {
		this.cache.delete(url);
	}

	private queryDomainInfo(domain: string): Promise<client_api.LookupResponse> {
		let TIMEOUT = 3000;
		let url = `${this.rootUrl}/siteinfo/${domain}?timeout=${TIMEOUT}`;
		return http_client.get(url).then(reply => {
			if (reply.status === 200) {
				return Promise.resolve(<client_api.LookupResponse>JSON.parse(reply.body));
			} else {
				return Promise.reject<client_api.LookupResponse>(
					new Error(`Failed to query site icons for ${domain}: ${reply.status}`)
					);
			}
		});
	}

	private domainForUrl(url: string) {
		return urlLib.parse(url).host;
	}
}
