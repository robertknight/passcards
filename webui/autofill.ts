import Q = require('q');

import forms = require('./forms');
import item_store = require('../lib/item_store');
import page_access = require('./page_access');
import stringutil = require('../lib/base/stringutil');

export interface AutoFillResult {
	count: number;
}

/** Interface for initiating auto-fill of items in
 * the active tab/page with values from a given @p item.
 */
export interface AutoFillHandler {
	/** Autofill fields on the current page with values from a given @p item.
	  * Returns a promise for the auto-filled entries.
	  */
	autofill(item: item_store.Item) : Q.Promise<AutoFillResult>
}

export class AutoFiller {
	private page: page_access.PageAccess;

	constructor(page: page_access.PageAccess) {
		this.page = page;
	}

	// match the ID or name of a field against a key
	private fieldMatch(field: forms.InputField, key: string) {
		var keyMatch = (propertyValue: string) => {
			return propertyValue && stringutil.indexOfIgnoreCase(propertyValue, key) != -1;
		}
		return keyMatch(field.id) || keyMatch(field.name) || keyMatch(field.ariaLabel) || keyMatch(field.placeholder);
	}

	autofill(item: item_store.Item) : Q.Promise<AutoFillResult> {
		var result = Q.defer<AutoFillResult>();
		var usernameKeys = ['email', 'user', 'account'];

		item.getContent().then((content) => {
			this.page.findForms((formList) => {
				var autofillEntries: forms.AutoFillEntry[] = [];

				var fields: forms.InputField[] = [];
				formList.forEach((form) => {
					fields = fields.concat(form.fields);
				});

				fields.forEach((field) => {
					if (!field.visible) {
						return;
					}

					var isUsernameField = false;
					var isPasswordField = false;

					if (this.fieldMatch(field, 'password') ||
					    field.type == forms.FieldType.Password) {
						isPasswordField = true;
					}

					if (!isPasswordField) {
						usernameKeys.forEach((key) => {
							if (this.fieldMatch(field, key) ||
								field.type === forms.FieldType.Email) {
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
						var entry: forms.AutoFillEntry = {
							key: field.key,
							value: autofillValue
						};
						autofillEntries.push(entry);
					}
				});

				this.page.autofill(autofillEntries).then((count) => {
					result.resolve({
						count: count
					});
				}).catch((err) => {
					result.reject(err);
				});
			});
		}).catch((err) => {
			result.reject(err);
		});

		return result.promise;
	}
}
