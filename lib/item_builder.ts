import item_store = require('./item_store');

/** Utility class for constructing vault items. */
export class Builder {
	private _item: item_store.Item;
	private _content: item_store.ItemContent;

	constructor(type: item_store.ItemType) {
		this._item = new item_store.Item();
		this._content = new item_store.ItemContent();

		this._item.typeName = type;
		this._item.setContent(this._content);
	}

	item() : item_store.Item {
		return this._item;
	}

	content() : item_store.ItemContent {
		return this._content;
	}

	itemAndContent() : item_store.ItemAndContent {
		return {
			item: this._item,
			content: this._content
		};
	}

	setTitle(title: string) : Builder {
		this._item.title = title;
		return this;
	}

	addLogin(username: string) : Builder {
		return this.addFormField('username', 'username', item_store.FormFieldType.Text, username);
	}

	addPassword(password: string) : Builder {
		return this.addFormField('password', 'password', item_store.FormFieldType.Password, password);
	}

	addFormField(name: string, designation: string, type: item_store.FormFieldType, value: string) : Builder {
		this._content.formFields.push({
			id: '',
			name: name,
			designation: designation,
			type: type,
			value: value
		});
		return this;
	}

	addUrl(url: string) : Builder {
		this._item.locations.push(url);
		this._content.urls.push({
			label: 'website',
			url: url
		});
		return this;
	}
}

export class SectionBuilder {
	private _section: item_store.ItemSection;

	constructor(name: string, title: string) {
		this._section = new item_store.ItemSection();
		this._section.name = name;
		this._section.title = title;
	}

	addField(kind: item_store.FieldType, title: string, value: any) : SectionBuilder {
		var field = new item_store.ItemField();
		field.kind = kind;
		field.title = title;
		field.value = value;
		this._section.fields.push(field);
		return this;
	}

	section() : item_store.ItemSection {
		return this._section;
	}
}

