// Partial typings for URIJS - http://medialize.github.io/URI.js/

interface ParsedURI {
	authority() : string;
	domain() : string;
	path() : string;
	port() : string;
	scheme() : string;
	subdomain() : string;
}

declare function URI(url: string) : ParsedURI;

declare module "URIjs" {
	export = URI;
}
