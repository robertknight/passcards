import onepass = require('../lib/onepass');
import page_access = require('./page_access');
import stringutil = require('../lib/base/stringutil');

/** Interface for initiating auto-fill of items in
 * the active tab/page with values from a given @p item.
 */
export interface AutoFillHandler {
	autofill(item: onepass.Item) : void;
}

export class AutoFiller {
	private pageAccess: page_access.PageAccess;

	constructor(pageAccess: page_access.PageAccess) {
		this.pageAccess = pageAccess;
	}

	// match the ID or name of a field against a key
	private fieldMatch(field: page_access.InputField, key: string) {
		var nameMatch = false;
		if (field.id && stringutil.indexOfIgnoreCase(field.id, key) != -1) {
			nameMatch = true;
		}
		if (field.name && stringutil.indexOfIgnoreCase(field.name, key) != -1) {
			nameMatch = true;
		}
		return nameMatch;
	}

	autofill(item: onepass.Item) : void {
		var usernameKeys = ['email', 'user', 'account'];

		item.getContent().then((content) => {
			this.pageAccess.findForms((fields) => {
				var autofillEntries: page_access.AutoFillEntry[] = [];

				fields.forEach((field) => {
					var isUsernameField = false;
					var isPasswordField = false;

					if (this.fieldMatch(field, 'password') ||
					    field.type == page_access.FieldType.Password) {
						isPasswordField = true;
					}

					if (!isPasswordField) {
						usernameKeys.forEach((key) => {
							if (this.fieldMatch(field, key) ||
								field.type === page_access.FieldType.Email) {
								isUsernameField = true;
							}
						});
					}

					var autofillValue: string;
					if (isUsernameField) {
						autofillValue = content.account();
					} else if (isPasswordField) {
						autofillValue = content.password();
					}

					if (autofillValue) {
						var entry: page_access.AutoFillEntry = {
							fieldId: field.id,
							fieldName: field.name,
							value: autofillValue
						};
						autofillEntries.push(entry);
					}
				});

				this.pageAccess.autofill(autofillEntries);
			});
		}).done();
	}
}

