declare module "adiff" {
	/** The type of a Diff returned by adiff is
	  * a variadic tuple which follows the pattern
	  * of the arguments to Array.splice():
	  * [index: number, deleted: number, added1: T1, added2: T2, ... addedN: TN]
	  */
	export interface Diff extends Array<any> {
		// TODO [TS > 1.1 - Use tuple types]
		[index: number] : any
	}

	export function diff(a: any[], b: any[]) : Diff[];
}

