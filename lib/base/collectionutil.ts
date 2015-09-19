/// <reference path="../../typings/es6-collections.d.ts" />

import Q = require('q');

interface BiDiMapEntry<T1, T2> {
	key1: T1;
	key2: T2;
}

/** A convenience interface for working with objects
  * as key => value dictionaries.
  */
export interface OMap<T> {
	[index: string]: T
}

/** A bi-directional map between two types of key.
  *
  * Currently only suitable for small maps.
  */
export class BiDiMap<T1, T2> {
	private entries: BiDiMapEntry<T1, T2>[]

	constructor() {
		this.entries = [];
	}

	add(key1: T1, key2: T2): BiDiMap<T1, T2> {
		this.entries.push({ key1: key1, key2: key2 });
		return this;
	}

	get(key1: T1): T2 {
		for (var i = 0; i < this.entries.length; i++) {
			if (this.entries[i].key1 == key1) {
				return this.entries[i].key2;
			}
		}
		return null;
	}

	get2(key2: T2): T1 {
		for (var i = 0; i < this.entries.length; i++) {
			if (this.entries[i].key2 == key2) {
				return this.entries[i].key1;
			}
		}
		return null;
	}
}

export function prettyJSON(object: any): string {
	return JSON.stringify(object, null /* replacer */, 2);
}

/** An interface for buffers which is compatible
  * with ordinary arrays, node Buffers, Uint8Array etc.
  */
export interface AbstractBuffer {
	[index: number]: number;
	length: number;
}

/** Copy the contents of @p src to @p dest. */
export function copyBuffer(dest: AbstractBuffer, src: AbstractBuffer) {
	var sharedLength = Math.min(src.length, dest.length);
	for (var i = 0; i < sharedLength; i++) {
		dest[i] = src[i];
	}
}

/** Produce a hex representation of the data in a typed array */
export function hexlify(buf: ArrayBufferView, len?: number): string {
	var hex = '';
	var byteBuf = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
	len = len || byteBuf.length;
	for (var i = 0; i < len; i++) {
		if (byteBuf[i] < 16) {
			hex += '0';
		}
		hex += byteBuf[i].toString(16);
	}
	return hex;
};

/** Convert a string containing binary data into a typed array */
export function bufferFromString(str: string): Uint8Array {
	var destBuf = new Uint8Array(str.length);
	for (var i = 0; i < str.length; i++) {
		destBuf[i] = str.charCodeAt(i);
	}
	return destBuf;
}

/** Convert a buffer into a binary string. */
export function stringFromBuffer(buf: AbstractBuffer): string {
	var str = '';
	for (var i = 0; i < buf.length; i++) {
		str += String.fromCharCode(buf[i]);
	}
	return str;
}

/** Convert a Node buffer or typed array into an ordinary
  * JS array.
  */
export function bufferToArray(buffer: AbstractBuffer): number[] {
	var result: number[] = [];
	for (var i = 0; i < buffer.length; i++) {
		result.push(buffer[i]);
	}
	return result;
}

/** Compares the first @p length indexes of two buffers and returns 0 if they are equal,
  * a value < 0 if the first mismatching value is less in @p first or a value > 0
  * otherwise.
  */
export function compare(first: AbstractBuffer, second: AbstractBuffer, length: number): number {
	var sharedLength = Math.min(first.length, second.length);
	for (var i = 0; i < sharedLength; i++) {
		var diff = first[i] - second[i];
		if (diff != 0) {
			return diff;
		}
	}
	if (sharedLength > first.length) {
		return -1;
	} else if (sharedLength > second.length) {
		return 1;
	} else {
		return 0;
	}
}

/** A wrapper around a DataView which uses little-endian ordering
  * for the (get|set)(U)int(16|32)() functions.
  */
export class LittleEndianDataView {
	byteLength: number;
	buffer: ArrayBuffer;

	constructor(private view: DataView) {
		this.byteLength = view.byteLength;
		this.buffer = view.buffer;
	}

	getUint8(offset: number) {
		return this.view.getUint8(offset);
	}

	getUint16(offset: number) {
		return this.view.getUint16(offset, true);
	}

	getUint32(offset: number) {
		return this.view.getUint32(offset, true);
	}

	getInt32(offset: number) {
		return this.view.getInt32(offset, true);
	}

	setInt32(offset: number, data: number) {
		this.view.setInt32(offset, data, true);
	}

	setUint32(offset: number, data: number) {
		this.view.setUint32(offset, data, true);
	}
}

/** A function which converts a list of items to a map, using @p keyFunc
  * to retrieve a key for each item.
  *
  * Throws an exception if @p keyFunc returns the same key for more
  * than one item.
  */
export function listToMap<K, T>(list: T[], keyFunc: (item: T) => K) {
	var map = new Map<K, T>();
	list.forEach((item) => {
		var key = keyFunc(item);
		if (map.has(key)) {
			throw new Error('Duplicate key');
		}
		map.set(key, item);
	});
	return map;
}

/** BatchedUpdateQueue is a helper for batching updates.
  *
  * A queue is constructed with a processing function which
  * takes a set of items to process and returns a promise
  * for when the items have been processed.
  *
  * When items are added to the queue using push(), it is collected
  * together with other updates and submitted to the processing function.
  *
  * Only one batch of updates will be processed at a time.
  *
  * An example use would be for saving updates to a JSON key/value file.
  * The processing function would take a list of key/value pairs to update,
  * load the current data file, apply the updates and save the contents back.
  * The push() function would be invoked with a key/value pair to save.
  *
  * If a large number of updates were submitted consecutively, these would
  * be collected into a small number of batches, so the data file would only
  * be read/updated/written a small number of times instead of once per
  * key/value pair submitted.
  */
export class BatchedUpdateQueue<T> {
	// callback to invoke to process a batch of updates
	private updateFn: (items: T[]) => Q.Promise<void>;

	// next batch of pending updates. These will be
	// passed to updateFn when the current batch
	// has been processed
	private pendingUpdates: T[];

	// promise for the result of the active call to
	// updateFn
	private currentFlush: Q.Promise<void>;

	// promise for the result of the next batch of
	// updates which will be submitted once the current
	// batch is complete
	private nextFlush: Q.Deferred<void>;

	/** Construct a new queue which calls @p updateFn with
	  * batches of updates to process.
	  *
	  * @p updateFn should return a promise which resolves once
	  * the updates are processed (eg. when the data has been
	  * saved to disk). Only one batch of updates will be processed
	  * at a time.
	  */
	constructor(updateFn: (items: T[]) => Q.Promise<void>) {
		this.updateFn = updateFn;
		this.currentFlush = Q<void>(null);
		this.pendingUpdates = [];
	}

	/** Enqueue a new update to process. Returns a promise which is resolved
	  * when the update has been processed.
	  *
	  * Updates are collected together and passed to the processing function
	  * in batches.
	  */
	push(update: T): Q.Promise<void> {
		this.pendingUpdates.push(update);
		if (this.nextFlush) {
			return this.nextFlush.promise;
		}

		this.nextFlush = Q.defer<void>();
		this.currentFlush.then(() => {
			this.currentFlush = this.updateFn(this.pendingUpdates);
			this.pendingUpdates = [];

			// [TS 1.1] Q.Deferred.resolve() can be called with either a promise or
			// a value but the typings only support a value.
			this.nextFlush.resolve(<any>this.currentFlush);
			this.nextFlush = null;
		});
		return this.nextFlush.promise;
	}
}

export function keys<K, V>(collection: Map<K, V>) {
	let keys: K[] = [];
	collection.forEach((v, k) => {
		keys.push(k);
	});
	return keys;
}
