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

// [TS/1.1]
interface Error {
	stack?: Object
}

