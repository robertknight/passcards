import assert = require('assert');
import fs = require('fs');
import path = require('path');

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
		return this.err.name;
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

let sourceCache: Map<string, string[]>;

function extractLines(filePath: string, start: number, end: number) {
	if (!sourceCache) {
		sourceCache = new Map<string, string[]>();
	}
	if (!sourceCache.has(filePath)) {
		let content = fs.readFileSync(filePath).toString('utf-8');
		let lines = content.split('\n');
		sourceCache.set(filePath, lines);
	}
	return sourceCache.get(filePath).slice(start, end);
}

// returns the root directory of the parent NPM
// module containing 'filePath'
function packageRoot(filePath: string) {
	if (filePath.length <= 1 || filePath[0] !== '/') {
		return '';
	}
	let dirPath = path.dirname(filePath);
	while (dirPath !== '/' && !fs.existsSync(`${dirPath}/package.json`)) {
		dirPath = path.dirname(dirPath);
	}
	return dirPath;
}

/** Takes a stack trace returned by Error.stack and returns
  * a more easily readable version as an array of strings.
  *
  * - Path names are expressed relative to the NPM module
  *   containing the current directory.
  * - Context snippets are added for each stack frame
  */
export function formatStack(trace: string) {
	assert(trace);
	try {
		let traceLines = trace.split('\n');
		let rootPath = packageRoot(__filename);
		let locationRegex = /([^() ]+):([0-9]+):([0-9]+)/;
		let formattedLines: string[] = [];
		for (let i = 0; i < traceLines.length; i++) {
			let line = traceLines[i].trim();
			let locationMatch = line.match(locationRegex);
			if (locationMatch) {
				let filePath = locationMatch[1];

				let lineNumber = parseInt(locationMatch[2]);
				let context = '';
				try {
					if (filePath[0] === '/') {
						context = extractLines(filePath, lineNumber - 1, lineNumber)[0].trim();
					}
				} catch (e) {
					context = '<source unavailable>';
				}
				formattedLines.push(`  ${path.relative(rootPath, filePath) }:${lineNumber}: ${context}`);
			} else {
				formattedLines.push(`  ${line}`);
			}
		}
		return formattedLines;
	} catch (ex) {
		return [`<failed to format stack: ${ex.toString() }>`].concat(ex.stack.split('\n'));
	}
}

