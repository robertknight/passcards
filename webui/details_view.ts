/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');

import controls = require('./controls');
import env = require('../lib/base/env');
import item_builder = require('../lib/item_builder');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
import material_ui = require('./material_ui');
import keycodes = require('./base/keycodes');
import page_access = require('./page_access');
import reactutil = require('./reactutil');
import shortcut = require('./base/shortcut');
import stringutil = require('../lib/base/stringutil');
import url_util = require('../lib/base/url_util');

var TextField = require('react-material/components/TextField');

interface ItemFieldState {
	selected?: boolean;
	revealed?: boolean;
	value?: string;
}

interface ItemFieldProps {
	label: string;
	value: string;
	isPassword: boolean;
	clipboard: page_access.ClipboardAccess;

	onChange(newValue: string) : boolean;
}

class ItemField extends typed_react.Component<ItemFieldProps, ItemFieldState> {
	getInitialState() {
		return {
			selected: false,
			revealed: false,
			value: this.props.value
		};
	}

	render() {
		var displayValue = this.state.value;
		var inputType = 'text';
		if (this.props.isPassword && !this.state.revealed) {
			inputType = 'password';
		}

		var fieldActions: react.Descriptor<any>;

		var revealButton: react.Descriptor<controls.ActionButtonProps>;
		if (this.props.isPassword) {
			revealButton = controls.ActionButtonF({
				value: this.state.revealed ? 'Hide' : 'Reveal',
				onClick: (e) => {
					e.preventDefault();
					this.setState({revealed: !this.state.revealed});
				}
			})
		}

		if (this.state.selected) {
			var copyButton: react.Descriptor<controls.ActionButtonProps>;
			if (this.props.clipboard.clipboardAvailable()) {
				copyButton = controls.ActionButtonF({
					value: 'Copy',
					onClick: (e) => {
						this.props.clipboard.copy('text/plain', this.props.value)
					}
				});
			}

			fieldActions = react.DOM.div({className: 'detailsFieldActions'},
				copyButton,
				revealButton
			);
		}

		return react.DOM.div({className: 'detailsField'},
			material_ui.TextFieldF({
				floatingLabel: true,
				placeHolder: this.props.label,
				value: displayValue,
				type: inputType,
				onChange: (e: Event) => {
					var newValue = (<HTMLInputElement>e.target).value;
					this.setState({value: newValue});
					this.props.onChange(newValue);
				},
				onFocus: () => {
					this.setState({selected: true});
				}
			}),
			fieldActions
		);
	}
}

var ItemFieldF = reactutil.createFactory(ItemField);

export enum ItemEditMode {
	AddItem,
	EditItem
}

export class DetailsViewProps {
	item: item_store.Item;
	iconProvider: item_icons.ItemIconProvider;
	clipboard: page_access.ClipboardAccess;
	editMode: ItemEditMode;

	onGoBack: () => any;
	onSave: (updates: item_store.ItemAndContent) => any;
	autofill: () => void;
}

interface DetailsViewState {
	itemContent?: item_store.ItemContent;
	editedItem?: item_store.ItemAndContent;
}

export class DetailsView extends typed_react.Component<DetailsViewProps, DetailsViewState> {
	private shortcuts: shortcut.Shortcut[];

	getInitialState() {
		return {};
	}

	componentWillReceiveProps(nextProps: DetailsViewProps) {
		if (!nextProps.item) {
			return;
		}

		if (!this.props.item || this.props.item != nextProps.item) {
			// forget previous item content when switching items
			this.setState({
				itemContent: null,
				editedItem: null
			});
			this.fetchContent(nextProps.item);
		}
	}

	componentDidUpdate() {
		this.updateShortcutState();
	}

	componentWillMount() {
		this.fetchContent(this.props.item);
	}

	componentDidMount() {
		var componentDoc = this.getDOMNode().ownerDocument;

		this.shortcuts = [
			new shortcut.Shortcut(componentDoc, keycodes.Backspace, () => {
				this.props.onGoBack();
			}),
			new shortcut.Shortcut(componentDoc, keycodes.a, () => {
				this.props.autofill();
			})
		];
		this.updateShortcutState();
	}

	componentDidUnmount() {
		this.shortcuts.forEach((shortcut) => {
			shortcut.remove();
		});
		this.shortcuts = [];
	}

	private updateShortcutState() {
		this.shortcuts.forEach((shortcut) => {
			shortcut.setEnabled(this.props.item != null);
		});
	}

	private fetchContent(item: item_store.Item) {
		item.getContent().then((content) => {
			if (!this.isMounted()) {
				return;
			}

			var editedItem = item_store.cloneItem({
				item: this.props.item,
				content: content
			}, this.props.item.uuid);
			this.setState({
				itemContent: content,
				editedItem: editedItem
			});
		}).done();
	}

	render() {
		var detailsContent : react.Descriptor<any>;
		var updatedItem = this.state.editedItem;
		if (updatedItem) {
			var accountField = updatedItem.content.accountField();
			var passwordField = updatedItem.content.passwordField();
			var coreFields: react.Descriptor<any>[] = [];
			var websites: react.Descriptor<any>[] = [];
			var sections: react.Descriptor<any>[] = [];

			updatedItem.content.sections.forEach((section, sectionIndex) => {
				var fields: react.Descriptor<any>[] = [];
				section.fields.forEach((field, fieldIndex) => {
					if (field.value) {
						fields.push(ItemFieldF({
							key: sectionIndex + '.' + fieldIndex,
							label: field.title,
							value: field.value,
							isPassword: field.kind == item_store.FieldType.Password,
							clipboard: this.props.clipboard,
							onChange: (newValue) => {
								field.value = newValue;
								return true;
							}
						}));
					}
				});
				sections.push(react.DOM.div({className: 'detailsSection'},
					fields)
				);
			});

			updatedItem.content.urls.forEach((url, urlIndex) => {
				websites.push(ItemFieldF({
					key: urlIndex,
					label: url.label,
					value: url.url,
					isPassword: false,
					clipboard: this.props.clipboard,
					onChange: (newValue) => {
						url.url = newValue;
						return true;
					}
				}));
			});

			if (accountField) {
				coreFields.push(ItemFieldF({
					key: 'account',
					label: 'Account',
					value: accountField ? accountField.value : '',
					isPassword: false,
					clipboard: this.props.clipboard,
					onChange: (newValue) => {
						if (accountField) {
							accountField.value = newValue;
						} else {
							updatedItem.content.formFields.push(item_builder.Builder.createLoginField(newValue));
						}
						return true;
					}
				}));
			}

			if (passwordField) {
				coreFields.push(ItemFieldF({
					key: 'password',
					label: 'Password',
					value: passwordField ? passwordField.value : '',
					isPassword: true,
					clipboard: this.props.clipboard,
					onChange: (newValue) => {
						if (passwordField) {
							passwordField.value = newValue;
						} else {
							updatedItem.content.formFields.push(item_builder.Builder.createPasswordField(newValue));
						}
						return true;
					}
				}));
			}

			detailsContent = react.DOM.div({className: 'detailsContent'},
				react.DOM.div({className: 'detailsHeader'},
					item_icons.IconControlF({
						location: this.props.item.primaryLocation(),
						iconProvider: this.props.iconProvider,
						visible: true,
						isFocused: false
					}),
					react.DOM.div({className: 'detailsOverview'},
						react.DOM.div({className: 'detailsTitle'}, updatedItem.item.title),
						react.DOM.div({className: 'detailsLocation'},
							react.DOM.a({href: updatedItem.item.primaryLocation()},
								url_util.domain(updatedItem.item.primaryLocation())
							)
						)
					)
				),
				react.DOM.div({className: 'detailsCore'},
					coreFields),
				react.DOM.div({className: 'detailsURLs'},
					websites),
				react.DOM.div({className: 'detailsSections'},
					sections)
			);
		}

		var autofillButton: react.Descriptor<any>;
		if (env.isFirefoxAddon() || env.isChromeExtension()) {
			autofillButton = controls.ActionButtonF({
				accessKey:'a',
				value: 'Autofill',
				onClick: () => this.props.autofill()
			});
		}

		var toolbarControls: react.Descriptor<any>[] = [];
		if (this.props.editMode == ItemEditMode.EditItem) {
			toolbarControls.push(controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#arrow-back',
				onClick: () => this.props.onGoBack(),
				key: 'back'
			}));
		} else {
			toolbarControls.push(controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#clear',
				onClick: () => this.props.onGoBack(),
				key: 'cancel'
			}));
		}
		toolbarControls.push(react.DOM.div({className:'toolbarSpacer'})),
		toolbarControls.push(controls.ToolbarButtonF({
			iconHref: 'icons/icons.svg#done',
			onClick: () => {
				this.props.onSave(this.state.editedItem);
				this.props.onGoBack();
			},
			key: 'save'
		}));

		return react.DOM.div({
			className: stringutil.truthyKeys({
					detailsView: true,
					hasSelectedItem: this.props.item
				}),
			ref: 'detailsView',
			tabIndex: 0
			},
			react.DOM.div({className: stringutil.truthyKeys({toolbar: true, detailsToolbar: true})},
				toolbarControls
			),
			react.DOM.div({className: 'itemActionBar'},
				autofillButton
			),
			detailsContent
		);
	}
}

export var DetailsViewF = reactutil.createFactory(DetailsView);

