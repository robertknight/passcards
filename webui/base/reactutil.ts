import react = require('react');
import react_dom = require('react-dom');
import { TransitionGroup } from 'react-transition-group';
import { CSSTransitionGroup } from 'react-transition-group';

import env = require('../../lib/base/env');
import transition_events = require('./transition_events');
import tsutil = require('../../lib/base/tsutil');

/** Extends the CSSProperties interface which as of 16/08/15
 * only lists a small subset of CSS properties with one with
 * a catch-all for other properties.
 *
 * See also https://github.com/borisyankov/DefinitelyTyped/pull/5089 for
 * a discussion on how best to resolve this upstream.
 */
export interface ExtendedCSSProperties extends react.CSSProperties {
    [index: string]: number | string;
}

/** Component factory returned by createFactory(). This extends
 * React.Factory with an additional property that specifies the
 * type of component which the factory creates.
 */
export interface Factory<P> extends react.Factory<P> {
    componentClass?: react.ComponentClass<P>;
}

export var TransitionGroupF = react.createFactory(TransitionGroup);
export var CSSTransitionGroupF = react.createFactory(CSSTransitionGroup);

/** Merge props passed to a parent component with those set in a child
 * component.
 *
 * Props set in @p childProps override those set in @p parentProps with
 * the exception of 'className' where the value in @p parentProps and
 * the value in @p childProps are concatenated.
 */
export function mergeProps<P, C>(parentProps: P, childProps: C): C {
    var childMap = tsutil.unsafeCast<C, { [index: string]: any }>(childProps);
    var parentMap = tsutil.unsafeCast<P, { [index: string]: any }>(parentProps);

    for (var k in parentMap) {
        if (!childMap.hasOwnProperty(k)) {
            childMap[k] = parentMap[k];
        } else if (k == 'className') {
            childMap[k] = childMap[k] + ' ' + parentMap[k];
        }
    }

    return childProps;
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
        if (
            objA.hasOwnProperty(key) &&
            (!objB.hasOwnProperty(key) || objA[key] !== objB[key])
        ) {
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
    for (var i = 0; i < changed.length; i++) {
        if (ignoredFields.indexOf(changed[i]) == -1) {
            return true;
        }
    }
    return false;
}

export interface StyleMap {
    [property: string]: any;
}

/** Add vendor prefix to inline property style names. */
export function prefix(style: StyleMap): StyleMap {
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

/** Wrapper around Window.requestAnimationFrame() which requests
 * execution of a callback
 */
export function requestAnimationFrame(callback: () => void) {
    if (env.isChromeExtension()) {
        // in Chrome extensions, requestAnimationFrame() never fires in
        // background pages, so find a view which is not hidden and use
        // rAF on that
        let views = chrome.extension.getViews();
        for (let view of views) {
            // look for a view which is a) not hidden according to the Page Visiblity API
            // and b) not the background page
            if (
                !view.document.hidden &&
                view !== chrome.extension.getBackgroundPage()
            ) {
                return view.requestAnimationFrame(callback);
            }
        }
        return null;
    } else {
        return window.requestAnimationFrame(callback);
    }
}

export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export function rectWidth(rect: Rect) {
    return rect.right - rect.left;
}

export function rectHeight(rect: Rect) {
    return rect.bottom - rect.top;
}

/** Describes the transition state of a view.
 *
 * The state is initially 'WillEnter' and transitions to
 * 'Entered' a moment afterwards.
 */
export enum TransitionState {
    WillEnter,
    Entered,
    Leaving,
    Left,
}

export class TransitionEndListener {
    private node: HTMLElement;
    private listener: (e: TransitionEvent) => void;

    /** Setup an event handler which is called when the CSS transition
     * for a given style @p property finishes on the DOM node for
     * a React @p component.
     *
     * Use remove() to remove the listener when no longer required.
     */
    constructor(
        component: react.Component<any, any> | HTMLElement,
        property: string,
        callback: () => void
    ) {
        if (component instanceof Element) {
            this.node = component;
        } else {
            this.node = react_dom.findDOMNode(component) as HTMLElement;
        }
        this.listener = e => {
            if (e.target === this.node && e.propertyName == property) {
                callback();
            }
        };
        transition_events.addEndEventListener(this.node, this.listener);
    }

    remove() {
        transition_events.removeEndEventListener(this.node, this.listener);
    }
}

export function awaitTransition(
    component: react.Component<{}, {}>,
    property: string,
    callback: () => void
) {
    let listener = new TransitionEndListener(component, property, () => {
        callback();
        listener.remove();
    });
}
