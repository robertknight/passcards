// Function extensions from ES6
interface ES6Function extends Function {
	// Implemented by all browsers except IE
	name: string;
}

/** Base class for custom errors.
  *
  * This provides a concrete implementation of the Error
  * interface and also provides support for wrapping
  * errors with additional context information.
  */
export class BaseError implements Error {
	/** When wrapping one error with another,
	  * this is used to store the original error.
	  */
	public sourceErr: Error;
	private err: Error;

	get name() {
		return this.err.name;
	}

	set name(name: string) {
		this.err.name = name;
	}

	get stack() {
		var stack = this.err.stack;
		if (this.sourceErr) {
			stack += `\n\ncaused by: ${this.sourceErr.stack}`;
		}
		return stack;
	}

	get message() {
		return this.err.message;
	}

	set message(message: string) {
		this.err.message = message;
	}

	constructor(message: string, sourceErr?: Error) {
		this.err = new Error(message);
		this.name = (<ES6Function>this.constructor).name;
		this.sourceErr = sourceErr;
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

/** Returns true if the string @p message appears in @p err's message
  * or any of the messages in the source error chain for @p err,
  * if @p err is an instance of BaseError.
  */
export function hasCause(err: Error, message: string): boolean {
	let baseErr = <BaseError>err;
	if (err.message.indexOf(message) !== -1) {
		return true;
	} else if (err instanceof BaseError && baseErr.sourceErr) {
		return hasCause(baseErr.sourceErr, message);
	} else {
		return false;
	}
}
