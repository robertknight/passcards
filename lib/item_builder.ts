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
