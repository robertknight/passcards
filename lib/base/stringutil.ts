// import Buffer explicitly so that the dependency is visible
// to the vendor bundle build script
import { Buffer } from 'buffer';

export function startsWith(str: string, prefix: string): boolean {
	return str.indexOf(prefix) == 0;
}

export function endsWith(str: string, suffix: string): boolean {
	return str.length >= suffix.length && str.lastIndexOf(suffix) == str.length - suffix.length;
}

export function indexOfIgnoreCase(haystack: string, needle: string): number {
	return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

export function equalIgnoreCase(a: string, b: string): boolean {
	return indexOfIgnoreCase(a, b) == 0 && a.length == b.length;
}

/** Returns the part of @p str after the last occurence of @p delimiter
  * or the whole string otherwise.
  */
export function suffix(str: string, delimiter: string): string {
	var idx = str.lastIndexOf(delimiter);
	if (idx == -1) {
		idx = 0;
	} else {
		idx += delimiter.length;
	}
	return str.slice(idx);
}

/** Returns a space-separated list of all the keys in @p obj which
  * have truthy values assigned to them.
  */
export function truthyKeys(obj: Object): string {
	var keys: string[] = [];
	Object.keys(obj).forEach((key) => {
		if ((<any>obj)[key]) {
			keys.push(key);
		}
	});
	return keys.join(' ');
}

/** Replace the last occurrence of @p pattern in @p subject with @p replacement */
export function replaceLast(subject: string, pattern: string, replacement: string): string {
	var index = subject.lastIndexOf(pattern);
	if (index == -1) {
		return subject;
	}
	return subject.slice(0, index) + replacement + subject.slice(index + pattern.length);
}

/** Splits a space-separated list into tokens in a manner similar to
  * shell/REPL command parsing.
  *
  * Tokens are delimited by spaces except where they are escaped by a backslash
  * or enclosed within single or double quotes.
  *
  * eg. parseCommandLine('one "two three" four\ five six') => ['one', 'two three', 'four five', 'six]
  */
export function parseCommandLine(str: string): string[] {
	var tokens: string[] = [];
	var token = '';

	var escapeNext = false;
	var quoteChar = '';

	for (var i = 0; i < str.length; i++) {
		if (escapeNext) {
			token += str[i];
			escapeNext = false;
			continue;
		}

		if (str[i] == ' ' && !quoteChar) {
			tokens.push(token);
			token = '';
		} else if (str[i] == "'" || str[i] == '"') {
			if (!quoteChar) {
				quoteChar = str[i];
			} else if (quoteChar == str[i]) {
				quoteChar = null;
			} else {
				token += str[i];
			}
		} else if (str[i] == '\\') {
			escapeNext = true;
		} else {
			token += str[i];
		}
	}
	if (token.length > 0) {
		tokens.push(token);
	}

	return tokens;
}

/** Return a string consisting of @p count consecutive repetition of
  * @p str.
  */
export function repeat(str: string, count: number): string {
	var result = '';
	for (var i = 0; i < count; i++) {
		result += str;
	}
	return result;
}

/** Converts a base64 string to a binary string */
export function atob(str: string) {
	if (typeof window !== 'undefined') {
		return window.atob(str);
	} else {
		return (new Buffer(str, 'base64')).toString('binary');
	}
}

/** Converts a binary string to base64 */
export function btoa(str: string) {
	if (typeof window !== 'undefined') {
		return window.btoa(str);
	} else {
		return (new Buffer(str, 'binary')).toString('base64');
	}
}
