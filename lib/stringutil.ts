export function startsWith(str: string, prefix: string) : boolean {
	return str.indexOf(prefix) == 0;
}

export function endsWith(str: string, suffix: string) : boolean {
	return str.lastIndexOf(suffix) == str.length - suffix.length;
}
