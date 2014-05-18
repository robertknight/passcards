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

