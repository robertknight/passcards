import Q = require('q');

import onepass = require('../lib/onepass');
import pageAccess = require('./page_access');
import stringutil = require('../lib/base/stringutil');

/** Interface for initiating auto-fill of items in
 * the active tab/page with values from a given @p item.
 */
export interface AutoFillHandler {
	/** Autofill fields on the current page with values from a given @p item.
	  * Returns a promise for the auto-filled entries.
	  */
	autofill(item: onepass.Item) : Q.Promise<pageAccess.AutoFillEntry[]>;
}

export class AutoFiller {
	private page: pageAccess.PageAccess;

	constructor(page: pageAccess.PageAccess) {
		this.page = page;
	}

	// match the ID or name of a field against a key
	private fieldMatch(field: pageAccess.InputField, key: string) {
		var keyMatch = (propertyValue: string) => {
			return propertyValue && stringutil.indexOfIgnoreCase(propertyValue, key) != -1;
		}
		return keyMatch(field.id) || keyMatch(field.name) || keyMatch(field.ariaLabel) || keyMatch(field.placeholder);
	}

	autofill(item: onepass.Item) : Q.Promise<pageAccess.AutoFillEntry[]> {
		var result = Q.defer<pageAccess.AutoFillEntry[]>();
		var usernameKeys = ['email', 'user', 'account'];

		item.getContent().then((content) => {
			this.page.findForms((fields) => {
				var autofillEntries: pageAccess.AutoFillEntry[] = [];

				fields.forEach((field) => {
					var isUsernameField = false;
					var isPasswordField = false;

					if (this.fieldMatch(field, 'password') ||
					    field.type == pageAccess.FieldType.Password) {
						isPasswordField = true;
					}

					if (!isPasswordField) {
						usernameKeys.forEach((key) => {
							if (this.fieldMatch(field, key) ||
								field.type === pageAccess.FieldType.Email) {
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
						var entry: pageAccess.AutoFillEntry = {
							fieldId: field.id,
							fieldName: field.name,
							value: autofillValue
						};
						autofillEntries.push(entry);
					}
				});

				this.page.autofill(autofillEntries);
				result.resolve(autofillEntries);
			});
		}).done();

		return result.promise;
	}
}

