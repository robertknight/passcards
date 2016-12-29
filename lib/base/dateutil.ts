/** Converts a UNIX timestamp in seconds since
 * the epoch to a JS Date.
 */
export function dateFromUnixTimestamp(timestamp: number): Date {
	return new Date(timestamp * 1000);
}

/** Converts a JS Date to a UNIX timestamp in seconds
 * since the epoch.
 */
export function unixTimestampFromDate(date: Date): number {
	return (date.getTime() / 1000) | 0;
}
