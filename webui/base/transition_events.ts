// Provides functions for listening to CSS transition
// and animation end events, handling browser-specific
// implementation details. Adapted from React sources.

/**
 * Copyright 2013-2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactTransitionEvents
 */

"use strict";

import env = require('../../lib/base/env');

interface EventNameMap {
	// non-prefixed event name
	[baseName: string]: {
		// map of CSS property name -> end event name
		[stylePropertyName: string]: string;
	}
};

/**
 * EVENT_NAME_MAP is used to determine which event fired when a
 * transition/animation ends, based on the style property used to
 * define that event.
 */
var EVENT_NAME_MAP: EventNameMap = {
	transitionend: {
		'transition': 'transitionend',
		'WebkitTransition': 'webkitTransitionEnd',
		'MozTransition': 'mozTransitionEnd',
		'OTransition': 'oTransitionEnd',
		'msTransition': 'MSTransitionEnd'
	},

	animationend: {
		'animation': 'animationend',
		'WebkitAnimation': 'webkitAnimationEnd',
		'MozAnimation': 'mozAnimationEnd',
		'OAnimation': 'oAnimationEnd',
		'msAnimation': 'MSAnimationEnd'
	}
};

var endEvents: string[] = [];

function detectEvents() {
	var testEl = document.createElement('div');
	var style = testEl.style;

	// On some platforms, in particular some releases of Android 4.x,
	// the un-prefixed "animation" and "transition" properties are defined on the
	// style object but the events that fire will still be prefixed, so we need
	// to check if the un-prefixed events are useable, and if not remove them
	// from the map
	if (!('AnimationEvent' in window)) {
		delete EVENT_NAME_MAP['animationend']['animation'];
	}

	if (!('TransitionEvent' in window)) {
		delete EVENT_NAME_MAP['transitionend']['transition'];
	}

	for (var baseEventName in EVENT_NAME_MAP) {
		var baseEvents = EVENT_NAME_MAP[baseEventName];
		for (var styleName in baseEvents) {
			if (styleName in style) {
				endEvents.push(baseEvents[styleName]);
				break;
			}
		}
	}
}

if (env.isBrowser()) {
	detectEvents();
}

interface EventListener<E extends Event> {
	(e: E): void;
}

export function addEndEventListener<E extends Event>(node: HTMLElement, eventListener: EventListener<E>) {
	if (endEvents.length === 0) {
		// If CSS transitions are not supported, trigger an "end animation"
		// event immediately.
		window.setTimeout(eventListener, 0);
		return;
	}
	endEvents.forEach((endEvent) => {
		node.addEventListener(endEvent, eventListener, false);
	});
}

export function removeEndEventListener<E extends Event>(node: HTMLElement, eventListener: EventListener<E>) {
	if (endEvents.length === 0) {
		return;
	}
	endEvents.forEach((endEvent) => {
		node.removeEventListener(endEvent, eventListener);
	});
}
