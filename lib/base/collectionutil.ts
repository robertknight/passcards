interface BiDiMapEntry<T1,T2> {
	key1: T1;
	key2: T2;
}

/** A convenience interface for working with objects
  * as key => value dictionaries.
  */
export interface OMap<T> {
	[index: string] : T
}

/** A basic polyfill for ES6 maps */
export class PMap<K,V> implements Map<K,V> {
	private map : OMap<V>;
	private count: number;

	size: number;

	constructor() {
		this.clear();
	}

	set(key: K, value: V) {
		if (!this.has(key)) {
			++this.size;
		}
		this.map[this.propName(key)] = value;
		return this;
	}

	get(key: K) {
		return this.map[this.propName(key)];
	}

	delete(key: K) {
		if (!this.has(key)) {
			return false;
		}
		--this.size;
		delete this.map[this.propName(key)];
		return true;
	}

	clear() {
		this.size = 0;
		this.map = {};
	}

	has(key: K) {
		return this.map.hasOwnProperty(this.propName(key));
	}

	forEach(callback: (value: V, index: K, map: Map<K,V>) => any) {
		throw new Error('PMap.forEach() is not implemented');
	}

	private propName(key: K) {
		return '$' + key;
	}
}

/** A bi-directional map between two types of key.
  *
  * Currently only suitable for small maps.
  */
export class BiDiMap<T1,T2> {
	private entries: BiDiMapEntry<T1,T2>[]

	constructor() {
		this.entries = [];
	}

	add(key1: T1, key2: T2) : BiDiMap<T1,T2> {
		this.entries.push({key1:key1, key2:key2});
		return this;
	}

	get(key1: T1) : T2 {
		for (var i=0; i < this.entries.length; i++) {
			if (this.entries[i].key1 == key1) {
				return this.entries[i].key2;
			}
		}
		return null;
	}

	get2(key2 : T2) : T1 {
		for (var i=0; i < this.entries.length; i++) {
			if (this.entries[i].key2 == key2) {
				return this.entries[i].key1;
			}
		}
		return null;
	}
}

export function prettyJSON(object: any) : string {
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
	for (var i=0; i < sharedLength; i++) {
		dest[i] = src[i];
	}
}

/** Produce a hex representation of the data in a typed array */
export function hexlify(buf: ArrayBufferView, len?: number) : string {
	var hex = '';
	var byteBuf = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
	len = len || byteBuf.length;
	for (var i=0; i < len; i++) {
		if (byteBuf[i] < 16) {
			hex += '0';
		}
		hex += byteBuf[i].toString(16);
	}
	return hex;
};

/** Convert a string containing binary data into a typed array */
export function bufferFromString(str: string) : Uint8Array {
	var destBuf = new Uint8Array(str.length);
	for (var i=0; i < str.length; i++) {
		destBuf[i] = str.charCodeAt(i);
	}
	return destBuf;
}

/** Convert a buffer into a binary string. */
export function stringFromBuffer(buf: AbstractBuffer) : string {
	var str = '';
	for (var i=0; i < buf.length; i++) {
		str += String.fromCharCode(buf[i]);
	}
	return str;
}

/** Convert a Node buffer or typed array into an ordinary
  * JS array.
  */
export function bufferToArray(buffer: AbstractBuffer) : number[] {
	var result: number[] = [];
	for (var i=0; i < buffer.length; i++) {
		result.push(buffer[i]);
	}
	return result;
}

/** Compares the first @p length indexes of two buffers and returns 0 if they are equal,
  * a value < 0 if the first mismatching value is less in @p first or a value > 0
  * otherwise.
  */
export function compare(first: AbstractBuffer, second: AbstractBuffer, length: number) : number {
	var sharedLength = Math.min(first.length, second.length);
	for (var i=0; i < sharedLength; i++) {
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

