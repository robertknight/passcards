import onepass = require('./onepass');

/** Utility class for constructing vault items. */
export class Builder {
	private _item: onepass.Item;
	private _content: onepass.ItemContent;

	constructor(type: onepass.ItemType) {
		this._item = new onepass.Item();
		this._content = new onepass.ItemContent();

		this._item.typeName = type;
		this._item.setContent(this._content);
	}

	item() : onepass.Item {
		return this._item;
	}

	content() : onepass.ItemContent {
		return this._content;
	}

	setTitle(title: string) : Builder {
		this._item.title = title;
		return this;
	}

	addLogin(username: string) : Builder {
		return this.addFormField('username', 'username', onepass.FormFieldType.Text, username);
	}

	addPassword(password: string) : Builder {
		return this.addFormField('password', 'password', onepass.FormFieldType.Password, password);
	}

	addFormField(name: string, designation: string, type: onepass.FormFieldType, value: string) : Builder {
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
		if (this._content.urls.length == 0) {
			this._item.location = url;
		}
		this._content.urls.push({
			label: 'website',
			url: url
		});
		return this;
	}
}

