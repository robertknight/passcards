import event_stream = require('../base/event_stream');

export interface Icon {
	url: string;
	width: number;
	height: number;
	data?: Uint8Array;
}

export interface SiteInfo {
	/** The URL which this data refers to. */
	url: string;

	/** Icons for this site. */
	icons: Icon[];
}

export enum QueryState {
	Updating,
	Ready
}

export interface QueryResult {
	info: SiteInfo;
	state: QueryState;
}

/** Interface for providers which return info
  * about a site or domain.
  */
export interface SiteInfoProvider {
	/** Emits events when updated site info is available for
	  * a given URL previously passed to lookup()
	  */
	updated: event_stream.EventStream<string>;

	/** Look up site info for a URL.
	  * Returns the currently available site info immediately.
	  * SiteInfoProvider.updated will emit events when future updates
	  * for the same domain become available.
	  */
	lookup(url: string): QueryResult;

	/** Return the current lookup status for a URL.
	  * Unlike lookup() this does not trigger a query
	  * if no site info is available for the URL.
	  */
	status(url: string): QueryResult;

	/** Tells the provider to forget any queried data for a URL.
	  * This can be used to free up resources once a client has fetched data
	  * for a given URL.
	  */
	forget(url: string): void;
}

