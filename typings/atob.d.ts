declare module "atob" {
	/** Decode a Base64-encoded string */
	function atob(base64: string) : string;
	export = atob;
}

declare module "btoa" {
	/** Encode a string to Base64 */
	function btoa(ascii: string) : string;
	export = btoa;
}

