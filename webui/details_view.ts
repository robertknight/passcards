/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');

import controls = require('./controls');
import div = require('./base/div');
import env = require('../lib/base/env');
import focus_mixin = require('./base/focus_mixin');
import item_builder = require('../lib/item_builder');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
import material_ui = require('./material_ui');
import keycodes = require('./base/keycodes');
import page_access = require('./page_access');
import reactutil = require('./reactutil');
import shortcut = require('./base/shortcut');
import text_field = require('./text_field');
import theme = require('./theme');
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

		var fieldActions: React.ReactElement<any>;

		var revealButton: React.ComponentElement<controls.ActionButtonProps>;
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
			var copyButton: React.ComponentElement<controls.ActionButtonProps>;
			if (this.props.clipboard.clipboardAvailable()) {
				copyButton = controls.ActionButtonF({
					value: 'Copy',
					onClick: (e) => {
						this.props.clipboard.copy('text/plain', this.props.value)
					}
				});
			}

			fieldActions = div(theme.detailsView.field.actions, {},
				copyButton,
				revealButton
			);
		}

		var fieldStyle: text_field.TextFieldStyle = {};
		if (this.props.isPassword) {
			fieldStyle.fontFamily = 'monospace';
		}

		return div(theme.detailsView.field, {ref: 'itemField'},
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
				readOnly: this.props.readOnly,
				showUnderline: !this.props.readOnly,
				style: fieldStyle
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
	focus: boolean;

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

	componentWillMount() {
		this.fetchContent(this.props.item);
	}

	componentDidMount() {
		var elt = <HTMLElement>this.getDOMNode();
		this.shortcuts = [
			new shortcut.Shortcut(elt, keycodes.Backspace, () => {
				this.props.onGoBack();
			}),
			new shortcut.Shortcut(elt, keycodes.a, () => {
				this.props.autofill();
			})
		];
	}

	componentDidUnmount() {
		this.shortcuts.forEach((shortcut) => {
			shortcut.remove();
		});
		this.shortcuts = [];
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
		var sections: React.ReactElement<any>[] = [];
		item.content.sections.forEach((section, sectionIndex) => {
			var fields: React.ComponentElement<any>[] = [];
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
			sections.push(div(null, {},
				fields)
			);
		});
		return sections;
	}

	private renderWebsites(item: item_store.ItemAndContent, onSave: () => void) {
		var websites: React.ComponentElement<any>[] = [];
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
		var coreFields: React.ComponentElement<any>[] = [];

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
		var toolbarControls: React.ReactElement<any>[] = [];
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
		toolbarControls.push(div(theme.detailsView.toolbarSpacer,{}));

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

		return div([theme.toolbar, theme.detailsView.toolbar], {},
			toolbarControls
		);
	}

	render() {
		var detailsContent : React.ReactElement<any>;
		var updatedItem = this.state.editedItem;
		if (updatedItem) {
			var onChangeItem = () => {
				updatedItem.item.updateOverviewFromContent(updatedItem.content);
				this.setState({
					editedItem: updatedItem,
					didEditItem: true
				});
			};

			var titleField: React.ReactElement<any>;
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
				titleField = div(theme.detailsView.overview.title, {}, updatedItem.item.title);
			}

			var coreFields = this.renderCoreFields(updatedItem, onChangeItem);
			var sections = this.renderSections(updatedItem, onChangeItem);
			var websites = this.renderWebsites(updatedItem, onChangeItem);

			detailsContent = div(theme.detailsView.content, {},
				div(theme.detailsView.header, {},
					item_icons.IconControlF({
						location: this.props.item.primaryLocation(),
						iconProvider: this.props.iconProvider,
						visible: true,
						isFocused: false
					}),
					div(theme.detailsView.overview, {},
						titleField,
						div(theme.detailsView.overview.location, {},
							react.DOM.a({href: updatedItem.item.primaryLocation()},
								url_util.domain(updatedItem.item.primaryLocation())
							)
						)
					)
				),
				div(theme.detailsView.coreFields, {}, coreFields),
				div(null, {}, websites),
				div(null, {}, sections)
			);
		}

		var autofillButton: React.ComponentElement<any>;
		if (env.isFirefoxAddon() || env.isChromeExtension()) {
			autofillButton = controls.ActionButtonF({
				accessKey:'a',
				value: 'Autofill',
				onClick: () => this.props.autofill()
			});
		}

		return div(theme.detailsView, {ref: 'detailsView', tabIndex: 0},
				this.renderToolbar()
			,
			div(theme.detailsView.itemActionBar, {},
				autofillButton
			),
			detailsContent
		);
	}
}

export var DetailsViewF = reactutil.createFactory(DetailsView, focus_mixin.FocusMixinM);

