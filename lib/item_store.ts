/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

// item_store contains the core interfaces and types for
// encrypted items and storage of them

import Q = require('q');
import sprintf = require('sprintf');
import underscore = require('underscore');

import asyncutil = require('./base/asyncutil');
import crypto = require('./onepass_crypto');
import collectionutil = require('./base/collectionutil');
import dateutil = require('./base/dateutil');
import event_stream = require('./base/event_stream');
import key_agent = require('./key_agent');
import stringutil = require('./base/stringutil');

// typedef for item type codes
export interface ItemType extends String {
}

/** Constants for the different types of item
	* that a vault may contain.
	*
	* Item type codes are taken from 1Password v4
	*/
export class ItemTypes {
	// The most common type, for logins and other web forms
	static LOGIN = <ItemType>'webforms.WebForm';

	// Other item types
	static CREDIT_CARD = <ItemType>'wallet.financial.CreditCard';
	static ROUTER = <ItemType>'wallet.computer.Router';
	static SECURE_NOTE = <ItemType>'securenotes.SecureNote';
	static PASSWORD = <ItemType>'passwords.Password';
	static EMAIL_ACCOUNT = <ItemType>'wallet.onlineservices.Email.v2';
	static BANK_ACCOUNT = <ItemType>'wallet.financial.BankAccountUS';
	static DATABASE = <ItemType>'wallet.computer.Database';
	static DRIVERS_LICENSE = <ItemType>'wallet.government.DriversLicense';
	static MEMBERSHIP = <ItemType>'wallet.membership.Membership';
	static HUNTING_LICENSE = <ItemType>'wallet.government.HuntingLicense';
	static PASSPORT = <ItemType>'wallet.government.Passport';
	static REWARD_PROGRAM = <ItemType>'wallet.membership.RewardProgram';
	static SERVER = <ItemType>'wallet.computer.UnixServer';
	static SOCIAL_SECURITY = <ItemType>'wallet.government.SsnUS';
	static SOFTWARE_LICENSE = <ItemType>'wallet.computer.License';
	static IDENTITY = <ItemType>'identities.Identity';

	// Non-item types
	static FOLDER = <ItemType>'system.folder.Regular';
	static SAVED_SEARCH = <ItemType>'system.folder.SavedSearch';

	// Marker type used to deleted items. The ID is preserved
	// but the type is set to Tombstone and all other data
	// is removed
	static TOMBSTONE = <ItemType>'system.Tombstone';
}

/** Map of item type codes to human-readable item type names */
export var ITEM_TYPES : ItemTypeMap = {
	"webforms.WebForm": {
		name:       "Login",
		shortAlias: "login",
	},
	"wallet.financial.CreditCard": {
		name:       "Credit Card",
		shortAlias: "card",
	},
	"wallet.computer.Router": {
		name:       "Wireless Router",
		shortAlias: "router",
	},
	"securenotes.SecureNote": {
		name:       "Secure Note",
		shortAlias: "note",
	},
	"passwords.Password": {
		name:       "Password",
		shortAlias: "pass",
	},
	"wallet.onlineservices.Email.v2": {
		name:       "Email Account",
		shortAlias: "email",
	},
	"system.folder.Regular": {
		name:       "Folder",
		shortAlias: "folder",
	},
	"system.folder.SavedSearch": {
		name:       "Smart Folder",
		shortAlias: "smart-folder",
	},
	"wallet.financial.BankAccountUS": {
		name:       "Bank Account",
		shortAlias: "bank",
	},
	"wallet.computer.Database": {
		name:       "Database",
		shortAlias: "db",
	},
	"wallet.government.DriversLicense": {
		name:       "Driver's License",
		shortAlias: "driver",
	},
	"wallet.membership.Membership": {
		name:       "Membership",
		shortAlias: "membership",
	},
	"wallet.government.HuntingLicense": {
		name:       "Outdoor License",
		shortAlias: "outdoor",
	},
	"wallet.government.Passport": {
		name:       "Passport",
		shortAlias: "passport",
	},
	"wallet.membership.RewardProgram": {
		name:       "Reward Program",
		shortAlias: "reward",
	},
	"wallet.computer.UnixServer": {
		name:       "Unix Server",
		shortAlias: "server",
	},
	"wallet.government.SsnUS": {
		name:       "Social Security Number",
		shortAlias: "social",
	},
	"wallet.computer.License": {
		name:       "Software License",
		shortAlias: "software",
	},
	"identities.Identity": {
		name:       "Identity",
		shortAlias: "id",
	},
	// internal entry type created for items
	// that have been removed from the trash
	"system.Tombstone": {
		name:       "Tombstone",
		shortAlias: "tombstone",
	},
};

export interface ItemTypeInfo {
	name : string;
	shortAlias : string;
}

export interface ItemTypeMap {
	// map of ItemType -> ItemTypeInfo
	[index: string] : ItemTypeInfo;
}

/** Represents a single item in a 1Password vault. */
export class Item {
	// store which this item belongs to, or null
	// if the item has not yet been saved
	private store: Store;

	// item ID and sync metadata
	uuid: string;
	updatedAt: Date;
	createdAt: Date;
	folderUuid: string;
	faveIndex: number;
	trashed: boolean;

	// overview metadata fields
	typeName: ItemType;
	title: string;
	locations: string[];
	openContents: ItemOpenContents;

	/** The decrypted content of the item, either set
	  * via setContent() or decrypted on-demand by
	  * getContent()
	  */
	private content : ItemContent;

	/** Create a new item. @p store is the store
	  * to associate the new item with. This can
	  * be changed later via saveTo().
	  *
	  * When importing an existing item or loading
	  * an existing item from the store, @p uuid may be non-null.
	  * Otherwise a random new UUID will be allocated for
	  * the item.
	  */
	constructor(store? : Store, uuid? : string) {
		this.store = store;

		this.uuid = uuid || crypto.newUUID();

		this.trashed = false;
		this.typeName = ItemTypes.LOGIN;
		this.folderUuid = '';
		this.locations = [];
	}

	/** Retrieves and decrypts the content of a 1Password item.
	  *
	  * In the Agile Keychain format, items are stored in two parts.
	  * The overview data is stored in both contents.js and replicated
	  * in the <UUID>.1password file for the item and is unencrypted.
	  *
	  * The item content is stored in the <UUID>.1password file and
	  * is encrypted using the store's master key.
	  *
	  * The item's store must be unlocked using Store.unlock() before
	  * item content can be retrieved.
	  */
	getContent() : Q.Promise<ItemContent> {
		if (this.content) {
			return Q(this.content);
		}
		return this.store.getContent(this);
	}

	setContent(content: ItemContent) {
		this.content = content;
	}

	/** Return the raw decrypted JSON data for an item.
	  * This is only available for saved items.
	  */
	getRawDecryptedData() : Q.Promise<string> {
		return this.store.getRawDecryptedData(this);
	}

	/** Save this item to its associated store */
	save() : Q.Promise<void> {
		if (!this.store) {
			return Q.reject('Item has no associated store');
		}
		return this.saveTo(this.store);
	}

	/** Save this item to the specified store */
	saveTo(store: Store) : Q.Promise<void> {
		if (!this.content && !this.isSaved()) {
			return Q.reject('Unable to save new item, no content set');
		}
		this.store = store;
		return this.store.saveItem(this);
	}

	/** Remove the item from the store.
	  * This erases all of the item's data and leaves behind a 'tombstone'
	  * entry for syncing purposes.
	  */
	remove() : Q.Promise<void> {
		if (!this.store) {
			return Q.reject('Item has no associated store');
		}
		this.typeName = ItemTypes.TOMBSTONE;
		this.title = 'Unnamed';
		this.trashed = true;
		this.setContent(new ItemContent);
		this.folderUuid = '';
		this.locations = [];
		this.faveIndex = null;
		this.openContents = null;

		return this.store.saveItem(this);
	}

	/** Returns true if this is a 'tombstone' entry remaining from
	  * a deleted item. When an item is deleted, all of the properties except
	  * the UUID are erased and the item's type is changed to 'system.Tombstone'.
	  *
	  * These 'tombstone' markers are preserved so that deletions are synced between
	  * different 1Password clients.
	  */
	isTombstone() : boolean {
		return this.typeName == ItemTypes.TOMBSTONE;
	}

	/** Returns true if this is a regular item - ie. not a folder,
	  * tombstone or saved search.
	  */
	isRegularItem() : boolean {
		return !stringutil.startsWith(<string>this.typeName, 'system.');
	}

	/** Returns a shortened version of the item's UUID, suitable for disambiguation
	  * between different items with the same type and title.
	  */
	shortID() : string {
		return this.uuid.slice(0,4);
	}

	/** Returns the human-readable type name for this item's type. */
	typeDescription() : string {
		if (ITEM_TYPES[<string>this.typeName]) {
			return ITEM_TYPES[<string>this.typeName].name;
		} else {
			return <string>this.typeName;
		}
	}

	/** Returns true if this item has been saved to a store. */
	isSaved() : boolean {
		return this.updatedAt != null;
	}

	/** Set the last-modified time for the item to the current time.
	  * If the created time for the item has not been initialized, it
	  * is also set to the current time.
	  */
	updateTimestamps() {
		if (!this.createdAt) {
			this.createdAt = new Date();
		}

		// update last-modified time
		var prevDate = this.updatedAt;
		this.updatedAt = new Date();

		// ensure that last-modified time always advances by at least one
		// second from the previous time on save.
		//
		// This is required to ensure the 'updatedAt' time saved in contents.js
		// changes since it only stores second-level resolution
		if (prevDate && this.updatedAt.getTime() - prevDate.getTime() < 1000) {
			this.updatedAt = new Date(prevDate.getTime() + 1000);
		}
	}

	/** Returns the main URL associated with this item or an empty
	  * string if there are no associated URLs.
	  */
	primaryLocation() : string {
		if (this.locations.length > 0) {
			return this.locations[0];
		} else {
			return '';
		}
	}

	/** Update item overview metadata to match the complete
	  * content of an item.
	  *
	  * This updates the URL list for an item.
	  */
	updateOverviewFromContent(content: ItemContent) {
		this.locations = [];
		content.urls.forEach((url) => {
			this.locations.push(url.url);
		});
	}
}

/** Represents the content of an item, usually stored
  * encrypted in a vault.
  */
export class ItemContent {
	sections : ItemSection[];
	urls : ItemUrl[];
	notes : string;
	formFields : WebFormField[];
	htmlMethod : string;
	htmlAction : string;
	htmlId : string;

	constructor() {
		this.sections = [];
		this.urls = [];
		this.notes = '';
		this.formFields = [];
		this.htmlMethod = '';
		this.htmlAction = '';
		this.htmlId = '';
	}

	/** Returns the account name associated with this item.
	  *
	  * The field used for the account name depends on the item
	  * type. For logins, this is the 'username' field.
	  *
	  * Returns an empty string if the item has no associated account.
	  */
	account() : string {
		var accountFields = underscore.filter(this.formFields, (field) => {
			return field.designation == 'username';
		});
		if (accountFields.length > 0) {
			return accountFields[0].value;
		}
		return '';
	}

	/** Returns the primary password associated with this item.
	  *
	  * This depends upon the item type. For logins, this is
	  * the 'password' field.
	  *
	  * Returns an empty password if the item has no associated
	  * account.
	  */
	password() : string {
		var passFields = underscore.filter(this.formFields, (field) => {
			return field.designation == 'password';
		});
		if (passFields.length > 0) {
			return passFields[0].value;
		}
		return '';
	}
}

/** Content of an item which is usually stored unencrypted
  * as part of the overview data.
  */
export class ItemOpenContents {
	tags : string[];

	/** Indicates where this item will be displayed.
	  * Known values are 'Always' (show everywhere)
	  * and 'Never' (never shown in browser)
	  */
	scope : string;
}

export class ItemSection {
	/** Internal name of the section. */
	name : string;

	/** User-visible title for the section. */
	title : string;
	fields : ItemField[];

	constructor() {
		this.fields = [];
		this.title = '';
		this.name = '';
	}
}

export class ItemField {
	kind : FieldType;
	name : string;
	title : string;
	value : any;

	valueString() : string {
		switch (this.kind) {
		case FieldType.Date:
			return dateutil.dateFromUnixTimestamp(this.value).toString();
		case FieldType.MonthYear:
			var month = this.value % 100;
			var year = (this.value / 100) % 100;
			return sprintf('%02d/%d', month, year);
		default:
			return this.value;
		}
	}
}

export enum FormFieldType {
	Text,
	Password,
	Email,
	Checkbox,
	Input
}

/** Saved value of an input field in a web form. */
export class WebFormField {
	value : string;

	/** 'id' attribute of the <input> element */
	id : string;

	/** Name of the field. For web forms this is the 'name'
	  * attribute of the <input> element.
	  */
	name : string;

	/** Type of input element used for this form field */
	type : FormFieldType;

	/** Purpose of the field. Known values are 'username', 'password' */
	designation : string;
}

/** Entry in an item's 'Websites' list. */
export class ItemUrl {
	label : string;
	url : string;
}

export enum FieldType {
	Text,
	Password,
	Address,
	Date,
	MonthYear,
	URL,
	CreditCardType,
	PhoneNumber,
	Gender,
	Email,
	Menu
}

export interface ListItemsOptions {
	includeTombstones?: boolean;
}

export interface Store {
	/** Emits events when items are updated in the store. */
	onItemUpdated: event_stream.EventStream<Item>;

	/** Emits events when the vault is unlocked. */
	onUnlock: event_stream.EventStream<void>;

	/** Unlock the vault */
	unlock(password: string) : Q.Promise<void>;

	/** List all of the items in the store */
	listItems(opts?: ListItemsOptions) : Q.Promise<Item[]>;

	/** Load the item with a specific ID */
	loadItem(uuid: string) : Q.Promise<Item>;

	/** Save changes to the overview data and item content
	  * back to the store.
	  */
	saveItem(item: Item) : Q.Promise<void>;

	/** Fetch and decrypt the item's secure contents. */
	getContent(item: Item) : Q.Promise<ItemContent>;

	/** Fetch and decrypt item's secure contents and return
	  * as a raw string - ie. without parsing the data and converting
	  * to an ItemContent instance.
	  */
	getRawDecryptedData(item: Item) : Q.Promise<string>;

	/** Retrieve the master encryption keys for this store. */
	listKeys() : Q.Promise<key_agent.Key[]>;

	/** Update the encryption keys in this store. */
	saveKeys(keys: key_agent.Key[]) : Q.Promise<void>;
}

/** A temporary store which keeps items only in-memory */
export class TempStore implements Store {
	onItemUpdated: event_stream.EventStream<Item>;
	onUnlock: event_stream.EventStream<void>;

	private keys: key_agent.Key[];
	private items: Item[];
	private content: collectionutil.PMap<string,ItemContent>;
	private keyAgent: key_agent.KeyAgent;

	constructor(agent: key_agent.KeyAgent) {
		this.items = [];
		this.content = new collectionutil.PMap<string,ItemContent>();
		this.onItemUpdated = new event_stream.EventStream<Item>();
		this.onUnlock = new event_stream.EventStream<void>();
		this.keyAgent = agent;
	}

	unlock(password: string) : Q.Promise<void> {
		return key_agent.decryptKeys(this.keys, password).then((keys) => {
			var savedKeys: Q.Promise<void>[] = [];
			keys.forEach((key) => {
				savedKeys.push(this.keyAgent.addKey(key.id, key.key));
			});
			return asyncutil.eraseResult(Q.all(savedKeys)).then(() => {
				this.onUnlock.publish(null);
			});
		});
	}

	listKeys() {
		return Q(this.keys);
	}

	saveKeys(keys: key_agent.Key[]) {
		this.keys = keys;
		return Q<void>(null);
	}

	listItems(opts: ListItemsOptions = {}) {
		var matches = this.items.filter((item) => {
			if (!opts.includeTombstones && item.isTombstone()) {
				return false;
			}
			return true;
		});

		return Q(matches);
	}

	saveItem(item: Item) {
		var saved = false;
		for (var i=0; i < this.items.length; i++) {
			if (this.items[i].uuid == item.uuid) {
				this.items[i] = item;
				saved = true;
			}
		}
		if (!saved) {
			this.items.push(item);
		}
		return item.getContent().then((content) => {
			item.updateOverviewFromContent(content);
			this.content.set(item.uuid, content);
			this.onItemUpdated.publish(item);
		});
	}

	loadItem(uuid: string) {
		var items = this.items.filter((item) => {
			return item.uuid == uuid;
		});
		if (items.length == 0) {
			return Q.reject(new Error('No such item'));
		} else {
			return Q(item);
		}
	}

	getContent(item: Item) {
		if (this.content.has(item.uuid)) {
			return Q(this.content.get(item.uuid));
		} else {
			return Q.reject(new Error('No such item'));
		}
	}

	getRawDecryptedData(item: Item) {
		return Q.reject(new Error('Not implemented in TempStore'));
	}
}
