/// <reference path="../../typings/adiff.d.ts" />
/// <reference path="../../typings/es6-collections.d.ts" />

// 'diff' provides a set of functions for diffing, merging
// and patching ordered lists and sets.
//
// It is built on the 'adiff' package but extends it with support
// for ordered sets and control over merge resolution.
//
// See also: The 'xdiff' package which is built on 'adiff' and adds
// support for (almost) arbitrary JSON documents. That currently lacks
// support for controlling merge resolution.
//
// TODO - Extend xdiff with support controlling merge resolution instead?

import adiff = require('adiff');
import assert = require('assert');

import e6c = require('es6-collections');
/* tslint:disable */
typeof e6c;
/* tslint:enable */

export enum OpType {
	Insert,
	Remove,

	/** An element was moved within an array. This type of
	  * operation is only produced when diff-ing sets
	  * (as opposed to lists)
	  */
	Move
}

export interface DiffOp<T> {
	type: OpType;

	/** Position in the source array to insert or remove
	  * an element. For move operations, this specifies
	  * the location to insert the moved element - a move
	  * op is equivalent to a remove op at 'prevPos' followed
	  * by an insert op at 'pos.
	  */
	pos: number;

	/** The value being inserted, removed or moved. */
	value: T;
	
	/** Previous index of element in the source array.
	  */
	prevPos?: number;

	/** Used when combining diffs to indicate which source a change
	  * came from.
	  */
	source?: number;
}

/** Returns true if a list is a set, ie.
  * all elements are unique.
  */
export function isSet<T>(a: T[]) {
	var sorted = a.slice(0).sort();
	for (var i = 1; i < sorted.length; i++) {
		if (sorted[i - 1] === sorted[i]) {
			return false;
		}
	}
	return true;
}

/** Compare two lists and return a set of changes required
  * to transform the first list into the second list.
  */
export function diffLists<T>(a: T[], b: T[]): DiffOp<T>[] {
	var diff = adiff.diff(a, b);
	var diffOps: DiffOp<T>[] = [];

	diff.forEach((change) => {
		var index: number = change[0];
		var deleted: number = change[1];
		var inserted: any[] = change.slice(2);

		var i = 0;
		for (i = 0; i < deleted; i++) {
			diffOps.push({
				type: OpType.Remove,
				pos: index + i,
				value: a[index + i]
			});
		}
		for (i = 0; i < inserted.length; i++) {
			diffOps.push({
				type: OpType.Insert,
				pos: index,
				value: inserted[i]
			});
		}
	});

	return diffOps;
}

/** Compare two ordered sets, represented as arrays of unique
  * elements and return a list of changes required to transform
  * the first set into the second set.
  *
  * The diff operations for a set can include insertion, removal
  * and movement of elements.
  */
export function diffSets<T>(a: T[], b: T[]): DiffOp<T>[] {
	assert(isSet(a));
	assert(isSet(b));

	// start with a list diff
	var diffOps = diffLists(a, b);

	// convert any (insert + remove) pairs
	// for the same item into a move op
	var diffSetOps: DiffOp<T>[] = [];
	diffOps.forEach((op) => {
		var bIndex = b.indexOf(op.value);
		if (op.type == OpType.Remove &&
			bIndex == -1) {
			// element removed in 'b'
			diffSetOps.push(op);
			return;
		}

		var aIndex = a.indexOf(op.value);
		if (op.type == OpType.Insert &&
			aIndex == -1) {
			// element added in 'b'
			diffSetOps.push(op);
			return;
		}

		assert(aIndex !== bIndex);

		// for element moves, we remove the 'remove'
		// op and replace the 'insert' op by a 'move'
		// op
		if (op.type == OpType.Remove) {
			return;
		}

		diffSetOps.push({
			type: OpType.Move,
			pos: op.pos,
			prevPos: aIndex,
			value: op.value
		});
	});

	return diffSetOps;
}

// transform a patch operation against a set of patches which have already been
// applied. This adjusts the position and other attributes to account
// for the changes which have already been made to the list/set
function transformPatch<T>(patch: DiffOp<T>, applied: DiffOp<T>[]) {
	var transformed = {
		type: patch.type,
		pos: patch.pos,
		value: patch.value
	};
	if (transformed.type == OpType.Insert) {
		// transformedPos(p) = p.pos - removals at rp < p.pos + insertions at ip <= p.pos
		applied.forEach((patch) => {
			if (patch.pos <= transformed.pos && patch.type == OpType.Insert) {
				++transformed.pos;
			}
			if (patch.pos < transformed.pos && patch.type == OpType.Remove) {
				--transformed.pos;
			}
		});
	} else if (patch.type == OpType.Remove) {
		// transformedPos(p) = p.pos - removals at rp <= p.pos + insertions at ip <= p.pos
		applied.forEach((patch) => {
			if (patch.pos <= transformed.pos) {
				if (patch.type === OpType.Insert) {
					++transformed.pos;
				} else if (patch.type === OpType.Remove) {
					--transformed.pos;
				}
			}
		});
	}
	//console.log('transformed patch', patch, '->', transformed);
	return transformed;
}

/** Apply a patch to a list or set and return the patched
  * version. The patches can be created using the diffSets()
  * or diffLists() functions.
  */
export function patch<T>(base: T[], patch_: DiffOp<T>[]): T[] {
	var patched = base.slice(0);

	// convert moves into insert + remove combinations
	var patch = patch_.slice();
	for (var i = 0; i < patch.length; i++) {
		if (patch[i].type == OpType.Move) {
			patch.splice(i, 1,
				{ type: OpType.Insert, value: patch[i].value, pos: patch[i].pos },
				{ type: OpType.Remove, value: patch[i].value, pos: patch[i].prevPos }
				);
		}
	}

	// sort patch operations by index
	patch.sort((a, b) => {
		return a.pos - b.pos;
	});

	// apply changes
	var applied: DiffOp<T>[] = [];
	patch.forEach((change) => {
		var transformed = transformPatch(change, applied);
		applied.push(change);
		switch (change.type) {
			case OpType.Insert:
				patched.splice(transformed.pos, 0, change.value);
				break;
			case OpType.Remove:
				assert.equal(patched[transformed.pos], change.value);
				patched.splice(transformed.pos, 1);
				break;
			default:
				assert(false, 'Unexpected patch op');
		}
	});
	return patched;
}

/** Combine two set diffs into a single diff.
  *
  * In the event of a conflict between a move on one side and a move/insert/remove
  * on the other, the change from 'a' wins.
  *
  * This can be used to implement a 3-way merge using:
  *
  *  patch(base, mergeSetDiffs(diffSets(base, a), diffSets(base, b)))
  *
  * Where 'base' is the common ancestor of 'a' and 'b'.
  */
export function mergeSetDiffs<T>(a: DiffOp<T>[], b: DiffOp<T>[]): DiffOp<T>[] {
	// annotate diff ops with the source diff they came from
	var combined: DiffOp<T>[] = [];
	a.forEach((e) => {
		combined.push({ type: e.type, pos: e.pos, prevPos: e.prevPos, value: e.value, source: 0 });
	});
	b.forEach((e) => {
		combined.push({ type: e.type, pos: e.pos, prevPos: e.prevPos, value: e.value, source: 1 });
	});

	var seen = new Set();
	combined = combined.filter((e) => {
		// changes to an element in the second diff are overridden
		// by changes to the element in the first diff
		if (e.source === 1 && seen.has(e.value)) {
			return false;
		}
		seen.add(e.value);
		return true;
	});

	return combined;
}

