import react = require('react');
import react_addons = require('react/addons');
import typed_react = require('typed-react');

import tsutil = require('../lib/base/tsutil');

export var CSSTransitionGroupF = react.createFactory(react_addons.addons.CSSTransitionGroup);

/** Merge props passed to a parent component with those set in a child
  * component.
  *
  * Props set in @p childProps override those set in @p parentProps with
  * the exception of 'className' where the value in @p parentProps and
  * the value in @p childProps are concatenated.
  */
export function mergeProps<P,C>(parentProps: P, childProps: C) : C {
	var childMap = tsutil.unsafeCast<C, {[index:string] : any}>(childProps);
	var parentMap = tsutil.unsafeCast<P, {[index:string] : any}>(parentProps);

	for (var k in parentMap) {
		if (!childMap.hasOwnProperty(k)) {
			childMap[k] = parentMap[k];
		} else if (k == 'className') {
			childMap[k] = childMap[k] + ' ' + parentMap[k];
		}
	}

	return childProps;
}

export function createFactory<P,S>(component: {new() : typed_react.Component<P,S>}, ...mixins: React.Mixin<any,any>[])
  : React.ComponentFactory<P> {
	return react.createFactory(typed_react.createClass(component, mixins));
}

/** Performs a shallow comparison of the properties of two objects and returns
  * a list of property names of properties which differ between the two.
  *
  * Adapted from the 'shallowEqual' module in react
  */
function changedFields(objA: any, objB: any) {
	if (objA === objB) {
		return [];
	}
	var changed: string[] = [];
	var key: string;
	// Test for A's keys different from B.
	for (key in objA) {
		if (objA.hasOwnProperty(key) &&
				(!objB.hasOwnProperty(key) || objA[key] !== objB[key])) {
					changed.push(key);
				}
	}
	// Test for B's keys missing from A.
	for (key in objB) {
		if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
			changed.push(key);
		}
	}

	return changed;
}

/** Returns true if any properties changed between objects 'a' and 'b',
  * using a shallow comparison of property values and ignoring any properties
  * listed in ignoredFields.
  */
export function objectChanged(a: any, b: any, ...ignoredFields: string[]) {
	var changed = changedFields(a, b);
	if (changed.length != ignoredFields.length) {
		return true;
	}
	for (var i=0; i < changed.length; i++) {
		if (ignoredFields.indexOf(changed[i]) == -1) {
			return true;
		}
	}
	return false;
}

export interface StyleMap {
	[property: string] : any;
}

/** Add vendor prefix to inline property style names. */
export function prefix(style: StyleMap) : StyleMap {
	// TODO - Find a suitable existing implementation of this
	var result: StyleMap = {};
	for (var key in style) {
		result[key] = style[key];
		if (key == 'transform') {
			result['WebkitTransform'] = style[key];
		}
	}
	return result;
}

