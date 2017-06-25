import forms = require('./forms');
import item_store = require('../lib/item_store');
import browser_access = require('./browser_access');
import stringutil = require('../lib/base/stringutil');
import { defer } from '../lib/base/promise_util';

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
    autofill(item: item_store.Item): Promise<AutoFillResult>;
}

export class AutoFiller {
    private page: browser_access.BrowserAccess;

    constructor(page: browser_access.BrowserAccess) {
        this.page = page;
    }

    // match the ID or name of a field against a key
    private fieldMatch(field: forms.InputField, key: string) {
        var keyMatch = (propertyValue: string) => {
            return (
                propertyValue &&
                stringutil.indexOfIgnoreCase(propertyValue, key) != -1
            );
        };
        return (
            keyMatch(field.id) ||
            keyMatch(field.name) ||
            keyMatch(field.ariaLabel) ||
            keyMatch(field.placeholder)
        );
    }

    autofill(item: item_store.Item): Promise<AutoFillResult> {
        var result = defer<AutoFillResult>();
        var usernameKeys = ['email', 'user', 'account'];
        let content: item_store.ItemContent;

        item
            .getContent()
            .then(itemContent => {
                content = itemContent;
                return this.page.findForms();
            })
            .then(formList => {
                var autofillEntries: forms.AutoFillEntry[] = [];

                formList.forEach(form => {
                    var foundPasswordField = false;
                    var foundUsernameField = false;

                    form.fields.forEach(field => {
                        if (!field.visible) {
                            return;
                        }

                        var isUsernameField = false;
                        var isPasswordField = false;

                        if (
                            this.fieldMatch(field, 'password') ||
                            field.type == forms.FieldType.Password
                        ) {
                            isPasswordField = true;
                        }

                        if (!isPasswordField) {
                            usernameKeys.forEach(key => {
                                if (
                                    this.fieldMatch(field, key) ||
                                    field.type === forms.FieldType.Email
                                ) {
                                    isUsernameField = true;
                                }
                            });
                        }

                        var autofillValue: string;
                        if (isUsernameField) {
                            autofillValue = item_store.ContentUtil.account(
                                content
                            );
                            foundUsernameField = true;
                        } else if (isPasswordField) {
                            autofillValue = item_store.ContentUtil.password(
                                content
                            );
                            foundPasswordField = true;
                        }

                        if (autofillValue) {
                            var entry: forms.AutoFillEntry = {
                                key: field.key,
                                value: autofillValue,
                            };
                            autofillEntries.push(entry);
                        }
                    });

                    // if a password field was found in the form
                    // but no corresponding username field was found,
                    // pick the most likely candidate for a username
                    // field
                    if (foundPasswordField && !foundUsernameField) {
                        form.fields.forEach(field => {
                            if (foundUsernameField || !field.visible) {
                                return;
                            }
                            if (
                                field.type === forms.FieldType.Text ||
                                field.type === forms.FieldType.Email
                            ) {
                                foundUsernameField = true;
                                autofillEntries.push({
                                    key: field.key,
                                    value: item_store.ContentUtil.account(
                                        content
                                    ),
                                });
                            }
                        });
                    }
                });

                this.page
                    .autofill(autofillEntries)
                    .then(count => {
                        result.resolve({
                            count: count,
                        });
                    })
                    .catch(err => {
                        result.reject(err);
                    });
            })
            .catch(err => {
                result.reject(err);
            });

        return result.promise;
    }
}
