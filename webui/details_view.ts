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
	readOnly: boolean;

	onChange(newValue: string) : boolean;
}

class ItemField extends typed_react.Component<ItemFieldProps, ItemFieldState> {
	private focusListener: EventListener;

	getInitialState() {
		return {
			selected: false,
			revealed: false,
			value: this.props.value
		};
	}

	componentDidMount() {
		var field = <HTMLElement>this.refs['itemField'].getDOMNode();
		this.focusListener = (e: FocusEvent) => {
			this.setState({selected: field.contains(<HTMLElement>e.target)});
		};
		field.ownerDocument.addEventListener('focus', this.focusListener,
		  true /* useCapture - non-capture focus events do not bubble */);
	}

	componentWillUnmount() {
		var field = this.refs['itemField'].getDOMNode();
		field.ownerDocument.removeEventListener('focus', this.focusListener, true /* useCapture */);
		this.focusListener = null;
	}

	render() {
		var displayValue = this.state.value;
		var inputType = 'text';
		if (this.props.isPassword && !this.state.revealed) {
			inputType = 'password';
		}

		var fieldActions: react.ReactElement<any,any>;

		var revealButton: react.ReactComponentElement<controls.ActionButtonProps>;
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
			var copyButton: react.ReactComponentElement<controls.ActionButtonProps>;
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

		return react.DOM.div({
			className: 'detailsField',
			ref: 'itemField'
		},
			material_ui.TextFieldF({
				floatingLabel: true,
				placeHolder: this.props.label,
				value: displayValue,
				type: inputType,
				onChange: (e: Event) => {
					var newValue = (<HTMLInputElement>e.target).value;
					this.setState({value: newValue});
					this.props.onChange(newValue);
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
	isEditing?: boolean;
	didEditItem?: boolean;
}

export class DetailsView extends typed_react.Component<DetailsViewProps, DetailsViewState> {
	private shortcuts: shortcut.Shortcut[];

	getInitialState() {
		return {
			isEditing: this.props.editMode === ItemEditMode.AddItem,
			didEditItem: false
		};
	}

	componentWillReceiveProps(nextProps: DetailsViewProps) {
		if (!nextProps.item) {
			return;
		}

		if (!this.props.item || this.props.item != nextProps.item) {
			// forget previous item content when switching items
			this.setState({
				itemContent: null,
				editedItem: null,

				// start in 'view details' mode initially unless
				// adding a new item
				isEditing: nextProps.editMode == ItemEditMode.AddItem,

				didEditItem: false
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

	private renderSections(item: item_store.ItemAndContent, onSave: () => void) {
		var sections: react.ReactElement<any,any>[] = [];
		item.content.sections.forEach((section, sectionIndex) => {
			var fields: react.ReactComponentElement<any>[] = [];
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
							onSave();
							return true;
						},
						readOnly: !this.state.isEditing
					}));
				}
			});
			sections.push(react.DOM.div({className: 'detailsSection'},
				fields)
			);
		});
		return sections;
	}

	private renderWebsites(item: item_store.ItemAndContent, onSave: () => void) {
		var websites: react.ReactComponentElement<any>[] = [];
		item.content.urls.forEach((url, urlIndex) => {
			websites.push(ItemFieldF({
				key: urlIndex,
				label: url.label,
				value: url.url,
				isPassword: false,
				clipboard: this.props.clipboard,
				onChange: (newValue) => {
					url.url = newValue;
					onSave();
					return true;
				},
				readOnly: !this.state.isEditing
			}));
		});
		return websites;
	}

	private renderCoreFields(item: item_store.ItemAndContent, onSave: () => void) {
		var coreFields: react.ReactComponentElement<any>[] = [];

		var accountField = item.content.accountField();
		var passwordField = item.content.passwordField();

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
						item.content.formFields.push(item_builder.Builder.createLoginField(newValue));
					}
					onSave();
					return true;
				},
				readOnly: !this.state.isEditing
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
						item.content.formFields.push(item_builder.Builder.createPasswordField(newValue));
					}
					onSave();
					return true;
				},
				readOnly: !this.state.isEditing
			}));
		}
		
		return coreFields;
	}

	private renderToolbar() {
		var toolbarControls: react.ReactElement<any,any>[] = [];
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
		toolbarControls.push(react.DOM.div({className:'toolbarSpacer'}));

		if (this.state.isEditing) {
			toolbarControls.push(controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#done',
				onClick: () => {
					if (this.state.didEditItem) {
						this.props.onSave(this.state.editedItem);
					}

					this.setState({isEditing:false});

					// go back to main item list after adding a new item
					if (this.props.editMode == ItemEditMode.AddItem) {
						this.props.onGoBack();
					}
				},
				key: 'save'
			}));
		} else {
			toolbarControls.push(controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#edit',
				onClick: () => {
					this.setState({isEditing:true});
				},
				key: 'edit'
			}));
		}

		return react.DOM.div({className: stringutil.truthyKeys({toolbar: true, detailsToolbar: true})},
			toolbarControls
		);
	}

	render() {
		var detailsContent : react.ReactElement<any,any>;
		var updatedItem = this.state.editedItem;
		if (updatedItem) {
			var onChangeItem = () => {
				updatedItem.item.updateOverviewFromContent(updatedItem.content);
				this.setState({
					editedItem: updatedItem,
					didEditItem: true
				});
			};

			var titleField: react.ReactElement<any,any>;
			if (this.state.isEditing) {
				titleField = ItemFieldF({
					label: 'Title',
					value: updatedItem.item.title,
					isPassword: false,
					clipboard: this.props.clipboard,
					onChange: (newValue) => {
						updatedItem.item.title = newValue;
						onChangeItem();
						return true;
					},
					readOnly: false
				});
			} else {
				titleField = react.DOM.div({className: 'detailsTitle'}, updatedItem.item.title);
			}

			var coreFields = this.renderCoreFields(updatedItem, onChangeItem);
			var sections = this.renderSections(updatedItem, onChangeItem);
			var websites = this.renderWebsites(updatedItem, onChangeItem);

			detailsContent = react.DOM.div({className: 'detailsContent'},
				react.DOM.div({className: 'detailsHeader'},
					item_icons.IconControlF({
						location: this.props.item.primaryLocation(),
						iconProvider: this.props.iconProvider,
						visible: true,
						isFocused: false
					}),
					react.DOM.div({className: 'detailsOverview'},
						titleField,
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

		var autofillButton: react.ReactComponentElement<any>;
		if (env.isFirefoxAddon() || env.isChromeExtension()) {
			autofillButton = controls.ActionButtonF({
				accessKey:'a',
				value: 'Autofill',
				onClick: () => this.props.autofill()
			});
		}

		return react.DOM.div({
				className: stringutil.truthyKeys({
					detailsView: true,
					hasSelectedItem: this.props.item
				}),
				ref: 'detailsView',
				tabIndex: 0
			},
				this.renderToolbar()
			,
			react.DOM.div({className: 'itemActionBar'},
				autofillButton
			),
			detailsContent
		);
	}
}

export var DetailsViewF = reactutil.createFactory(DetailsView);

