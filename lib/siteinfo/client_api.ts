// Definitions for types used in the Passcards Site Info API

export interface LookupResponseIcon {
	width: number;
	height: number;
	sourceUrl: string;
	dataUrl: string;
}

export interface LookupResponse {
	domain: string;
	icons: LookupResponseIcon[];
	lastModified: number;
	status: string;
	submitted: number;
}
