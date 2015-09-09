// this file defines the JSON structures used in .1password files
// in the Agile Keychain format.
//
// These separate the representation used in .1password files
// from the internal representations defined in onepass.ts

/** Structure for the encryptionKeys.js file
  * containing the master key encrypted with
  * the master password.
  */
export class EncryptionKeyList {
	/** List of encryption keys in the file.
	  */
	list: EncryptionKeyEntry[];

	/** Map of security level -> key identifier (string) */
	[keyLevel: string]: any;
}

export class EncryptionKeyEntry {
	/** Base64-encoded encryption key */
	data: string;

	/** UUID for the key */
	identifier: string;

	/** Number of iterations of the password derivation
	  * function used to derive the key from the master
	  * password.
	  */
	iterations: number;

	/** 'Security level' of the key. This links keys with items
	  * using the Item.securityLevel field.
	  */
	level: string;

	/** Encryption key encrypted with itself as
	  * a base 64 string.
	  */
	validation: string;
}

export class ItemField {
	/** Content-type for the field.
	  * Known types and value representations are:
	  *
	  * 'address' - ItemAddress object
	  * 'date' - A UNIX timestamp
	  * 'monthYear' - Date as an integer with digits YYYYMM (eg. 201405)
	  * 'string', 'URL', 'cctype', 'phone', 'gender', 'email', 'menu'
	  */
	k: string;
	/** Internal name of the field */
	n: string;
	/** User-visible title of the field */
	t: string;
	/** Value of the field */
	v: any;
}

export class ItemAddress {
	street: string;
	country: string;
	city: string;
	zip: string;
	state: string;
}

export class ItemSection {
	/** The internal name for this section. */
	name: string;

	/** The user-visible title/label for this section */
	title: string;
	fields: ItemField[];
}

export class ItemUrl {
	/** User-visible label for the URL. The default
	  * label used for the URL associated with new logins
	  * is 'website'
	  */
	label: string;
	url: string;
}

export class ItemContent {
	sections: ItemSection[];

	/* tslint:disable:variable-name */
	URLs: ItemUrl[];
	/* tslint:enable */

	notesPlain: string;

	// attributes for web form fields.
	// Also used for basic 'login' entries which
	// are represented as if they were simple web
	// forms with username and password fields
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

	/** Indicates which contexts this item should be displayed in.
	  * Known values are 'Always' (show this item in all UIs) and
	  * and 'Never' (do not show the item in web browsers).
	  */
	scope: string;
}

export interface Item {
	uuid: string;
	title: string;

	/** Item type code. See item_store.ITEM_TYPES */
	typeName: string;

	/** Identifies the encryption key used to encrypt
	  * the data for this item.
		*
		* This refers to the `level` field of the EncryptionKeyEntry
		* object in encryptionKeys.js
	  */
	securityLevel?: string;

	/** Identifies the encryption key used to encrypt
	 * the data for this item.
	 *
	 * This refers to the `identifier` field of the EncryptionKeyEntry
	 * object in encryptionKeys.js
	 *
	 * One of the `securityLevel` and `keyID` fields must be
	 * defined. If both are defined, they should refer to the same
	 * item.
	 */
	keyID?: string;

	/** UNIX timestamp specifying the creation date for this item */
	createdAt: number;
	/** UNIX timestamp specifying the last update date for this item */
	updatedAt: number;

	faveIndex?: number;
	trashed?: boolean;

	/** Base64-encoded encrypted data for the item */
	encrypted?: string;

	/** Tags, 'scope' and other unencrypted metadata
	  * for the item.
	  */
	openContents?: ItemOpenContent;

	/** When exporting to .1pif format, secureContents contains
	  * the data that normally appears in the encrypted field as
	  * a plaintext JSON object.
	  */
	secureContents?: ItemContent;

	/** Primary location associated with this item. */
	location?: string;

	/** ID of the folder that this item belongs to (if any) */
	folderUuid?: string;

	contentsHash?: string;
}
