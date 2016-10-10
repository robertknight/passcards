
/** Utility for implementing caching of data which is
  * slow to retrieve or expensive to compute.
  */
export class Cached<T> {
	private cached: T;
	private getter: () => Promise<T>;
	private setter: (value: T) => Promise<void>;
	private reading: Promise<T>;

	/** Construct a Cached<T> instance which reads
	  * a value using @p getter and writes it using
	  * @p setter.
	  */
	constructor(getter: () => Promise<T>,
		setter: (value: T) => Promise<void>) {
		this.getter = getter;
		this.setter = setter;
	}
	            
	/** Retrieve the value. When first called this invokes
	  * the getter passed to the constructor and caches
	  * the result. Subsequent calls retrieve the cached
	  * result.
	  */
	get(): Promise<T> {
		if (this.cached) {
			return Promise.resolve(this.cached);
		} else if (this.reading) {
			return this.reading;
		} else {
			this.reading = this.getter();
			return this.reading.then((value) => {
				this.reading = null;
				this.cached = value;
				return value;
			});
		}
	}

	/** Save an updated value. This optimistically updates
	  * the cached value and then invokes the setter
	  * passed to the constructor to set the value.
	  */
	set(value: T): Promise<void> {
		this.cached = value;
		return this.setter(value);
	}

	/** Forget the cached value. It will be retrieved
	  * from the original source on the next call
	  * to get()
	  */
	clear() {
		this.cached = null;
	}
}

