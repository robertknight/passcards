import diff = require('./diff');
import testLib = require('../test');

testLib.addTest('isSet', (assert) => {
	assert.ok(diff.isSet(['a', 'b', 'c']));
	assert.ok(diff.isSet([]));
	assert.ok(!diff.isSet(['a', 'a']));
	assert.ok(!diff.isSet(['a', 'b', 'a']));
});

testLib.addTest('diff lists', (assert) => {
	var a = [1, 2, 3];
	var b = [1, 4, 2];

	var delta = diff.diffLists(a, b);
	assert.deepEqual(delta, [
		{ type: diff.OpType.Remove, pos: 1, value: 2 },
		{ type: diff.OpType.Remove, pos: 2, value: 3 },
		{ type: diff.OpType.Insert, pos: 1, value: 4 },
		{ type: diff.OpType.Insert, pos: 1, value: 2 }
	]);
});

testLib.addTest('diff sets', (assert) => {
	var a = [1, 2, 3];
	var b = [1, 4, 2];

	var delta = diff.diffSets(a, b);
	assert.deepEqual(delta, [
		{ type: diff.OpType.Remove, pos: 2, value: 3 },
		{ type: diff.OpType.Insert, pos: 1, value: 4 },
		{ type: diff.OpType.Move, pos: 1, prevPos: 1, value: 2 }
	]);
});

testLib.addTest('patch list', (assert) => {

	var testCases = [
		// insert only
		{ a: [], b: [1, 2, 3] },
		// delete only
		{ a: [1, 2, 3], b: [] },
		// single insert, single delete
		{ a: [1, 2, 3], b: [1, 4, 2] },
		// single insert, single delete
		{ a: [1, 2, 3, 4, 5], b: [1, 5, 3, 6, 4] },
		// multi-insert, multi-delete
		{ a: [1, 2, 3, 4, 5], b: [1, 6, 7, 5] },
		{ a: [1, 2, 3, 4], b: [6, 3, 7] }
	];

	testCases.forEach((test) => {
		var delta = diff.diffLists(test.a, test.b);
		var patched = diff.patch(test.a, delta);
		assert.deepEqual(patched, test.b);
	});
});

interface PatchTestCase {
	a: number[];
	b: number[];
}

testLib.addTest('patchSet', (assert) => {
	var testCases: PatchTestCase[] = [
		{ a: [], b: [1, 2, 3] },
		{ a: [1, 2, 3], b: [1, 4, 2] },
		{ a: [1, 2], b: [2, 1] },
		{ a: [1, 2, 3, 4, 5], b: [5, 4, 3, 2, 1] },
		{ a: [1, 2, 3], b: [] },
		{ a: [1, 2, 5, 6, 8, 9], b: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
	];

	testCases.forEach((test) => {
		var delta = diff.diffSets(test.a, test.b);
		var patched = diff.patch(test.a, delta);
		assert.deepEqual(patched, test.b);
	});
});

interface MergeTestCase {
	base: number[];
	a: number[];
	b: number[];
	merged: number[];
}

testLib.addTest('merge diffs', (assert) => {
	var testCases: MergeTestCase[] = [
		// insert different elements in a, b
		{ base: [], a: [1, 2], b: [1, 3], merged: [1, 2, 3] },
		// remove elements on one side
		{ base: [1], a: [], b: [1], merged: [] },
		// remove elements on both sides
		{ base: [1, 2, 3], a: [1, 2], b: [1, 3], merged: [1] },
		// remove same elements on both sides
		{ base: [1, 2], a: [1], b: [1], merged: [1] },
		// insert same elements on both sides
		{ base: [1], a: [1, 2], b: [1, 2], merged: [1, 2] },
		// move element on one side
		{ base: [1, 2], a: [2, 1], b: [1, 2], merged: [2, 1] },
		{ base: [1, 2, 3, 4, 5], a: [1, 2, 3, 4, 5], b: [5, 1, 2, 3, 4], merged: [5, 1, 2, 3, 4] },
		{ base: [1, 2, 3, 4, 5], a: [5, 1, 2, 3, 4], b: [1, 2, 3, 4, 5], merged: [5, 1, 2, 3, 4] },
		// move elements on both sides
		{ base: [1, 2], a: [2, 1], b: [2, 1], merged: [2, 1] },
		{ base: [1, 2, 3, 4, 5], a: [5, 2, 3, 4, 1], b: [1, 4, 3, 2, 5], merged: [5, 4, 3, 2, 1] },
		// conflicting move on both sides
		{ base: [1, 2, 3], a: [2, 1, 3], b: [1, 3, 2], merged: [2, 3, 1] },
		// move + remove
		{ base: [1, 2, 3], a: [2, 1, 3], b: [1, 2], merged: [2, 1] }
	];
	testCases.forEach((test, i) => {
		var deltaA = diff.diffSets(test.base, test.a);
		var deltaB = diff.diffSets(test.base, test.b);
		var merged = diff.mergeSetDiffs(deltaA, deltaB);
		var patched = diff.patch(test.base, merged);
		assert.deepEqual(patched, test.merged, i.toString());
	});
});

