/// <reference path="../../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import underscore = require('underscore');

export interface EventListener<T> {
	(event?: T) : void;
}

export class EventStream<T> {
	private listeners: Array<EventListener<T>>;

	/** Maximum number of listeners for this event. If the number
	  * of listeners exceeds this value, a warning will be displayed.
	  */
	maxListeners: number;

	constructor() {
		this.listeners = [];
		this.maxListeners = 50;
	}

	listen(callback: EventListener<T>) : EventListener<T> {
		if (this.listeners.length >= this.maxListeners) {
			// if the number of listeners for a single event stream grows large,
			// we may have a leak. Output a warning
			console.warn('EventStream has %d listeners. Check for leaks.', this.listeners.length);
		}

		this.listeners.push(callback);
		return callback;
	}

	ignore(callback: EventListener<T>) : void {
		this.listeners = underscore.filter(this.listeners, (listener) => {
			return listener !== callback;
		});
	}

	publish(event: T) : void {
		this.listeners.forEach((listener) => {
			listener(event);
		});
	}
}

