// Function extensions from ES6
interface ES6Function extends Function {
	// Implemented by all browsers except IE
	name: string;
}

/** Base class for custom errors */
export class BaseError implements Error {
	/** When wrapping one error with another,
	  * this is used to store the original error.
	  */
	public sourceErr: Error;
	private err: Error;

	get name() {
		return this.name;
	}

	set name(name: string) {
		this.err.name = name;
	}

	get stack() {
		return this.err.stack;
	}

	get message() {
		return this.err.message;
	}

	set message(message: string) {
		this.err.message = message;
	}

	constructor(message: string) {
		this.err = new Error(message);
		this.name = (<ES6Function>this.constructor).name;
	}

	toString() {
		return this.name + ': ' + this.message;
	}
}

/** Base class for errors when querying HTTP-based APIs
  */
export class ApiError extends BaseError {
	constructor(public url: string, public status: number, public message: string) {
		super(message);
	}
}

