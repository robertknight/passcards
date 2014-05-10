/** Decode a Base64-encoded string */
declare function atob(base64: string) : string;

/** Encode a string to Base64 */
declare function btoa(ascii: string) : string;

declare module "atob" {
	export = atob;
}

declare module "btoa" {
	export = btoa;
}

