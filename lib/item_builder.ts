import item_store = require('./item_store');

/** Utility class for constructing vault items. */
export class Builder {
	private _item: item_store.Item;
	private _content: item_store.ItemContent;

	constructor(type: item_store.ItemType) {
		this._item = new item_store.Item();
		this._content = item_store.ContentUtil.empty();

		this._item.typeName = type;
		this._item.setContent(this._content);
	}

	item(): item_store.Item {
		return this._item;
	}

	content(): item_store.ItemContent {
		return this._content;
	}

	itemAndContent(): item_store.ItemAndContent {
		return {
			item: this._item,
			content: this._content
		};
	}

	setTitle(title: string): Builder {
		this._item.title = title;
		return this;
	}

	addLogin(username: string): Builder {
		this._content.formFields.push(Builder.createLoginField(username));
		this._item.updateOverviewFromContent(this._content);
		return this;
	}

	addPassword(password: string): Builder {
		this._content.formFields.push(Builder.createPasswordField(password));
		return this;
	}

	addFormField(name: string, designation: string, type: item_store.FormFieldType, value: string): Builder {
		this._content.formFields.push({
			id: '',
			name: name,
			designation: designation,
			type: type,
			value: value
		});
		return this;
	}

	addUrl(url: string): Builder {
		this._content.urls.push({
			label: 'website',
			url: url
		});
		this._item.updateOverviewFromContent(this._content);
		return this;
	}

	static createLoginField(account: string): item_store.WebFormField {
		return {
			id: '',
			name: 'username',
			designation: 'username',
			type: item_store.FormFieldType.Text,
			value: account
		};
	}

	static createPasswordField(password: string): item_store.WebFormField {
		return {
			id: '',
			name: 'password',
			designation: 'password',
			type: item_store.FormFieldType.Password,
			value: password
		};
	}
}

export class SectionBuilder {
	private _section: item_store.ItemSection;

	constructor(name: string, title: string) {
		this._section = {
			name,
			title,
			fields: []
		};
	}

	addField(kind: item_store.FieldType, title: string, value: any): SectionBuilder {
		this._section.fields.push({
			name: '',
			kind,
			title,
			value
		});
		return this;
	}

	section(): item_store.ItemSection {
		return this._section;
	}
}

export interface LoginItemOptions {
	title?: string;
	username?: string;
	password?: string;
	url?: string;
}

export function createItem(opts: LoginItemOptions) {
	var builder = new Builder(item_store.ItemTypes.LOGIN);
	if (opts.title) {
		builder.setTitle(opts.title);
	}
	if (opts.username) {
		builder.addLogin(opts.username);
	}
	if (opts.password) {
		builder.addPassword(opts.password);
	}
	if (opts.url) {
		builder.addUrl(opts.url);
	}
	return builder.item();
}

