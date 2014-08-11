// this file contains DOM declarations and corrections for
// methods missing from TypeScript's lib.d.ts file

// [TS/1.0] IDBKeyRange static methods are
// represented as interface methods
/*declare var IDBKeyRange : {
	bound(lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean): IDBKeyRange;
    only(value: any): IDBKeyRange;
    lowerBound(bound: any, open?: boolean): IDBKeyRange;
    upperBound(bound: any, open?: boolean): IDBKeyRange;
}*/

