import onepass = require('./onepass');

/** Utility class for constructing vault items. */
export class Builder {
	private _item: onepass.Item;
	private content: onepass.ItemContent;

	constructor(type: string) {
		this._item = new onepass.Item();
		this.content = new onepass.ItemContent();

		this._item.typeName = type;
		this._item.setContent(this.content);
	}

	item() : onepass.Item {
		return this._item;
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
		this.content.formFields.push({
			id: '',
			name: name,
			designation: designation,
			type: type,
			value: value
		});
		return this;
	}

	addUrl(url: string) : Builder {
		this.content.urls.push({
			label: 'website',
			url: url
		});
		return this;
	}
}

