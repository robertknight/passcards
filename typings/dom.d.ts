// this file contains DOM declarations and corrections for
// methods missing from TypeScript's lib.d.ts file

// [TS/1.0] IDBKeyRange static interface is missing
declare var IDBKeyRange: {
    prototype: IDBKeyRange;
    new(): IDBKeyRange;
    bound(lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean): IDBKeyRange;
    only(value: any): IDBKeyRange;
    lowerBound(bound: any, open?: boolean): IDBKeyRange;
    upperBound(bound: any, open?: boolean): IDBKeyRange;
}

// [TS/1.0] ClipboardEvent is missing from lib.d.ts
interface ClipboardEvent extends Event {
	clipboardData: DataTransfer;
}

declare var ClipboardEvent: {
	new(type: string, args: {
		dataType: string;
		data: string;
	}) : ClipboardEvent;
}

