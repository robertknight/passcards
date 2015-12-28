declare module "xdiff" {
	/** A change is an tuple of (change type, change path, change value)
	  * where 'change type' is 'set', 'del' or 'splice'
	  */
	export interface Change {
		[index: number]: Change
	}

	/** Diff returns an array of changes or undefined if
	  * the objects are structurally identical.
	  */
	export function diff(a: Object, b: Object): Change[];

	/** Diff returns an array of changes or undefined if
	  * the arrays are of equal length and a[i] is structurally equal
	  * to b[i] for every i.
	  */
	export function diff(a: any[], b: any[]): Change[];

	export function diff3(mine: Object, yours: Object, old: Object): Change[];
	export function patch(src: Object, diff: Change[]): any;
	export function patch(src: any[], diff: Change[]): any[];
}

