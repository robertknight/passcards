// Function extensions from ES6
interface ES6Function extends Function {
	// Implemented by all browsers except IE
	name: string;
}

export class BaseError implements Error {
	private err: Error;

	name: string;
	message: string;

	constructor(message: string) {
		this.err = new Error(message);
		this.name = (<ES6Function>this.constructor).name;
		this.message = message;
	}
}

