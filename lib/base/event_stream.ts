
export interface EventListener<T> {
	(event?: T): void;
}

interface ListenerAndContext<T> {
	callback: EventListener<T>;
	context: any;
}

export class EventStream<T> {
	private listeners: Array<ListenerAndContext<T>>;

	/** Maximum number of listeners for this event. If the number
	  * of listeners exceeds this value, a warning will be displayed.
	  */
	maxListeners: number;

	constructor() {
		this.listeners = [];
		this.maxListeners = 10;
	}

	/** Register a new listener for events published on this stream.
	  *
	  * Listeners may optionally be associated with a @p context object
	  * which is unique amongst all listeners.
	  *
	  * If a context is provided, any existing listeners associated with
	  * the same context will be removed before the new listener is added.
	  *
	  * Listeners are invoked in the order they were registered.
	  */
	listen(callback: EventListener<T>, context?: any): EventListener<T> {
		if (this.listeners.length >= this.maxListeners) {
			// if the number of listeners for a single event stream grows large,
			// we may have a leak. Output a warning
			console.warn('EventStream has %d listeners. Check for leaks or raise ' +
			             'the limit with EventStream.maxListeners', this.listeners.length);
			console.trace();
		}

		if (context !== undefined) {
			this.ignoreContext(context);
		}

		this.listeners.push({
			context: context,
			callback: callback
		});
		return callback;
	}

	/** Remove all listeners which were added with the given
	  * @p callback
	  */
	ignore(callback: EventListener<T>): void {
		this.listeners = this.listeners.filter((listener) => {
			return listener.callback !== callback;
		});
	}

	/** Remove all listeners which were added with the given
	  * @p context object
	  */
	ignoreContext(context: any): void {
		this.listeners = this.listeners.filter((listener) => {
			return listener.context !== context;
		});
	}

	/** Publish an event to all registered listeners, in the order
	  * they were registered.
	  */
	publish(event: T): void {
		this.listeners.forEach((listener) => {
			listener.callback(event);
		});
	}

	listenerCount() {
		return this.listeners.length;
	}
}
