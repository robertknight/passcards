// this file contains DOM declarations and corrections for
// methods missing from TypeScript's lib.d.ts file
//
// The TypeScript version against which the declarations
// were originally written is given in brackets against
// each group of declarations.

// [TS/1.0] IDBKeyRange static interface is missing
declare var IDBKeyRange: {
    prototype: IDBKeyRange;
    new(): IDBKeyRange;
    bound(lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean): IDBKeyRange;
    only(value: any): IDBKeyRange;
    lowerBound(bound: any, open?: boolean): IDBKeyRange;
    upperBound(bound: any, open?: boolean): IDBKeyRange;
}

// [TS/1.0]
interface ClipboardEvent extends Event {
	clipboardData: DataTransfer;
}

declare var ClipboardEvent: {
	new(type: string, args: {
		dataType: string;
		data: string;
	}) : ClipboardEvent;
}

// [TS/1.0]
// https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent
interface Touch {
	pageX: number;
	pageY: number;
}

interface TouchList {
	length: number;
	[index: number] : Touch;
}

interface TouchEvent extends Event {
	touches: TouchList
}

// [TS/1.0]
interface Window {
	// Unprefixed crypto property for browsers other than IE
	// available via msCrypto in IE 11
	crypto: Crypto;
}

// [TS/1.1]
interface Error {
	stack?: Object
}

