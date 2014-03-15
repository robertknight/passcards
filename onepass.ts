export class Item {
	updatedAt : number;
	title : string;
	securityLevel : string;
	encrypted : string;
	typeName : string;
	uuid : string;
	createdAt : number;
	location : string;
	folderUuid : string;
	faveIndex : number;
	trashed : boolean;
}

export class EncryptionKeyEntry {
	data : string;
	identifier : string;
	iterations : number;
	level : string;
	validation : string;
}

export class ItemType {
	name : string;
	shortAlias : string;
}

export class ItemContent {
	sections : ItemSection[];
	urls : ItemUrl[];
	notes : string;
	formFields : WebFormField[];
	htmlMethod : string;
	htmlAction : string;
	htmlId : string;
}

export class ItemOpenContents {
	tags : string[];
	scope : string;
}

export class ItemSection {
	name : string;
	title : string;
	fields : ItemField[];
}

export class ItemField {
	kind : string;
	name : string;
	title : string;
	value : any;
}

export class WebFormField {
	value : string;
	id : string;
	name : string;
	type : string;
	designation : string;
}

export class ItemUrl {
	label : string;
	url : string;
}

