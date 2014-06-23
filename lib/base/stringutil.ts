export function startsWith(str: string, prefix: string) : boolean {
	return str.indexOf(prefix) == 0;
}

export function endsWith(str: string, suffix: string) : boolean {
	return str.lastIndexOf(suffix) == str.length - suffix.length;
}

/** Returns a space-separated list of all the keys in @p obj which
  * have truthy values assigned to them.
  */
export function truthyKeys(obj: Object) : string {
	var keys : string[] = [];
	Object.keys(obj).forEach((key) => {
		if ((<any>obj)[key]) {
			keys.push(key);
		}
	});
	return keys.join(' ');
}

/** Splits a shell/REPL command-line into tokens. Tokens are delimited by spaces
  * except where they are escaped by a backslash or enclosed within single
  * or double quotes.
  *
  * eg. parseCommandLine('one "two three" four\ five six') => ['one', 'two three', 'four five', 'six]
  */
export function parseCommandLine(str: string) : string[] {
	var tokens : string[] = [];
	var token = '';

	var escapeNext = false;
	var quoteChar = '';

	for (var i=0; i < str.length; i++) {
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

