/// <reference path="../typings/DefinitelyTyped/clone/clone.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import assert = require('assert');
import clone = require('clone');
import underscore = require('underscore');

import diff = require('./base/diff');
import item_store = require('./item_store');

/** Performs a 3-way merge of ordered sets.
  */
export function mergeOrderedSets<T>(base: T[], a: T[], b: T[]) : T[] {
	var deltaA = diff.diffSets(base, a);
	var deltaB = diff.diffSets(base, b);
	var merged = diff.mergeSetDiffs(deltaA, deltaB);
	return diff.patch(base, merged);
}

/** Merge the values from a field of two items.
  *
  * @param baseValue The last-synced value of the field
  * @param firstValue The current value of the field in the first item
  * @param secondValue The current value of the field in the second item
  */
export function mergeField<T>(baseValue: T, firstValue: T, secondValue: T) {
	if (baseValue === firstValue) {
		// unchanged, or only changed in item 'b'
		return secondValue;
	} else if (baseValue === secondValue) {
		// only changed in item 'a'
		return firstValue;
	} else {
		// conflict. Always use the value from item 'a'
		// for the moment.
		return firstValue;
	}
}

export function mergeObject<T>(base: T, first: T, second: T) {
	assert(base);
	assert(first);
	assert(second);

	var base_: any = base;
	var first_: any = first;
	var second_: any = second;
	
	var result: any = {};
	Object.keys(base_).forEach((key) => {
		result[key] = mergeField(base_[key], first_[key], second_[key]);
	});
	return <T>result;
}

/** Merge an array of values from a field of two items.
  * Items in the three arrays are matched up using a key returned
  * by keyFunc and matched elements are then merged using mergeField()
  *
  * @param baseArray The last-synced value of the field
  * @param firstArray The current value of the field in the first item
  * @param secondArray The current value of the field in the second item
  * @param keyFunc A function which returns a key to match up elements
  *                from the three arrays.
  */
export function mergeArrays<T,Key>(baseArray: T[], firstArray: T[], secondArray: T[],
                                   keyFunc: (entry: T) => Key) {
	var keyMapper = (elt: T[]) => {
		return elt.map((e) => {
			return keyFunc(e);
		});
	};

	var baseKeys = keyMapper(baseArray);
	var firstKeys = keyMapper(firstArray);
	var secondKeys = keyMapper(secondArray);

	var mergedKeys = mergeOrderedSets(baseKeys, firstKeys, secondKeys);
	var mergedArray: T[] = [];

	mergedKeys.forEach((key) => {
		var baseIndex = baseKeys.indexOf(key);
		var firstIndex = firstKeys.indexOf(key);
		var secondIndex = secondKeys.indexOf(key);
		var mergedEntry: T;

		if (firstIndex != -1 && secondIndex != -1) {
			// element added in both items or updated in one or both items
			mergedEntry = mergeField(baseArray[baseIndex], firstArray[firstIndex], secondArray[secondIndex]);
		} else if (baseIndex == -1) {
			// entry added in first or second item
			mergedEntry = firstArray[firstIndex] || secondArray[secondIndex];
		} 

		assert(mergedEntry);
		mergedArray.push(mergedEntry);
	});

	return mergedArray;
}

export function merge(a: item_store.ItemAndContent,
                      b: item_store.ItemAndContent,
                      base?: item_store.ItemAndContent) {
		var merged = {
			item: new item_store.Item(null /* store */, a.item.uuid),
			content: new item_store.ItemContent()
		};

		// this is an item that has been updated in either store
		var mergeItemField = <T>(getter: (item: item_store.ItemAndContent) => T) => {
			var baseValue = getter(base);
			var firstValue = getter(a);
			var secondValue = getter(b);
			return mergeField(baseValue, firstValue, secondValue);
		};

		var mergeItemArray = <T,Key>(getter: (item: item_store.ItemAndContent) => T[],
		                             keyFunc: (element: T) => Key) => {
			var baseValue = getter(base);
			var firstValue = getter(a);
			var secondValue = getter(b);
			return mergeArrays(baseValue, firstValue, secondValue, keyFunc);
		};

		// merge overview data
		merged.item.title = mergeItemField((item) => {
			return item.item.title;
		});
		merged.item.folderUuid = mergeItemField((item) => {
			return item.item.folderUuid;
		});
		merged.item.trashed = mergeItemField((item) => {
			return item.item.trashed;
		});
		merged.item.createdAt = mergeItemField((item) => {
			return item.item.createdAt;
		});
		merged.item.typeName = mergeItemField((item) => {
			return item.item.typeName;
		});
		merged.item.openContents = mergeItemField((item) => {
			return item.item.openContents;
		});

		// merge content
		merged.content.sections = mergeItemArray((item) => {
			return item.content.sections;
		}, (section) => {
			return section.name;
		});
		merged.content.urls = mergeItemArray((item) => {
			return item.content.urls;
		}, (url) => {
			return url.label;
		});
		merged.content.notes = mergeItemField((item) => {
			return item.content.notes;
		});
		merged.content.formFields = mergeItemArray((item) => {
			return item.content.formFields;
		}, (field) => {
			return field.name;
		});
		merged.content.htmlMethod = mergeItemField((item) => {
			return item.content.htmlMethod;
		});
		merged.content.htmlAction = mergeItemField((item) => {
			return item.content.htmlAction;
		});
		merged.content.htmlId = mergeItemField((item) => {
			return item.content.htmlId;
		});

		merged.item.setContent(merged.content);

		return merged;
}

