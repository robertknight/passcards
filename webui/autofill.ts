import onepass = require('../lib/onepass');
import page_access = require('./page_access');

export interface AutoFillHandler {
	autofill(item: onepass.Item) : void;
}

export class AutoFiller {
	private pageAccess: page_access.PageAccess;

	constructor(pageAccess: page_access.PageAccess) {
		this.pageAccess = pageAccess;
	}

	autofill(item: onepass.Item) : void {
		var usernameKeys = ['email', 'username'];

		item.getContent().then((content) => {
			this.pageAccess.findForms((fields) => {
				var autofillEntries: page_access.AutoFillEntry[] = [];

				fields.forEach((field) => {
					var isUsernameField = false;
					var isPasswordField = false;

					usernameKeys.forEach((key) => {
						if ((field.id && field.id.indexOf(key) != -1) ||
							(field.name && field.name.indexOf(key) != -1) ||
							field.type === page_access.FieldType.Email) {

							isUsernameField = true;
						}
					});
					if (!isUsernameField) {
						if ((field.id && field.id.indexOf('password') != -1) ||
							(field.name && field.name.indexOf('password') != -1) ||
							field.type === page_access.FieldType.Password) {

							isPasswordField = true;
						}
					}

					var entry: page_access.AutoFillEntry;

					if (isUsernameField) {
						entry = {
							fieldId: field.id,
							fieldName: field.name,
							value: content.account()
						};
					} else if (isPasswordField) {
						entry = {
							fieldId: field.id,
							fieldName: field.name,
							value: content.password()
						};
					}

					if (entry) {
						autofillEntries.push(entry);
					}
				});

				this.pageAccess.autofill(autofillEntries);
			});
		}).done();
	}
}

