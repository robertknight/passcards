// this file defines the JSON structures used in .1password files
// in the Agile Keychain format.
//
// These separate the representation used in .1password files
// from the internal representations defined in onepass.ts

export class ItemField {
	/** Content-type for the field */
	k: string;
	/** Internal name of the field */
	n: string;
	/** User-visible title of the field */
	t: string;
	/** Value of the field */
	v: any;
}

export class ItemSection {
	name: string;
	title: string;
	fields: ItemField[];
}

export class ItemUrl {
	label: string;
	url: string;
}

export class ItemContent {
	sections: ItemSection[];

	/* tslint:disable:variable-name */
	URLs: ItemUrl[];
	/* tslint:enable */

	notesPlain: string;
	fields: WebFormField[];
	htmlMethod: string;
	htmlAction: string;
	htmlID: string;
}

/** Stored value for an input field in a web
 * form.
 *
 * Also always used for the username and password fields
 * of login entries.
 */
export class WebFormField {
	value: string;
	
	/** 'id' attribute of the <input> element */
	id: string;

	/** Name of the field. For web forms this is the 'name'
	 * attribute of the associated <input> element
	 */
	name: string;

	/** Single char code identifying the type of field value -
	 * (T)ext, (P)assword, (E)mail, (C)heckbox,
	 * (I)nput (eg. button)
	 */
	type: string;

	/** Purpose of the field, main values
	 * are 'username', 'password'
	 */
	designation: string;
}

export class ItemOpenContent {
	tags: string[];
	scope: string;
}

export class Item {
	uuid: string;
	title: string;
	typeName: string;
	securityLevel: string;
	createdAt: number;
	updatedAt: number;
	faveIndex: number;
	trashed: boolean;

	encrypted: string;
	openContents: ItemOpenContent;
	secureContents: ItemContent;
}

