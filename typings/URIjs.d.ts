interface ParsedURI {
	authority() : string;
	domain() : string;
	subdomain() : string;
}

declare function URI(url: string) : ParsedURI;

declare module "URIjs" {
	export = URI;
}
