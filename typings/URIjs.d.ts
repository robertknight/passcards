// Partial typings for URIJS - http://medialize.github.io/URI.js/

// See http://medialize.github.io/URI.js/docs.html

interface ParsedURI {
	authority() : string;
	domain() : string;
	hostname() : string;
	path() : string;
	port() : string;
	scheme() : string;
	subdomain() : string;

	absoluteTo(url: string): ParsedURI;
	relativeTo(url: string): ParsedURI;

	toString() : string;
}

interface URIParts {
	protocol?: string;
	username?: string;
	password?: string;
	hostname?: string;
	port?: number;
	path?: string;
	query?: string;
	fragment?: string;
}

interface URIjs {
	(url: string) : ParsedURI;
	(url: URIParts) : ParsedURI;

	parse(uri: string) : URIParts;
	build(parts: URIParts) : string;
}

declare module "URIjs" {
	var URI: URIjs;
	export = URI;
}
