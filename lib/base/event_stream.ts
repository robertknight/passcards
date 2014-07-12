/// <reference path="../../typings/DefinitelyTyped/underscore/underscore.d.ts" />

import underscore = require('underscore');

export interface EventListener<T> {
	(event?: T) : void;
}

export class EventStream<T> {
	private listeners: Array<EventListener<T>>;

	constructor() {
		this.listeners = [];
	}

	listen(callback: EventListener<T>) : EventListener<T> {
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

