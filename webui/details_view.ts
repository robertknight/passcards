/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import controls = require('./controls');
import div = require('./base/div');
import env = require('../lib/base/env');
import focus_mixin = require('./base/focus_mixin');
import item_builder = require('../lib/item_builder');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
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
	onDelete?() : void;
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

	componentWillReceiveProps(nextProps: ItemFieldProps) {
		if (this.props.value !== nextProps.value || nextProps.readOnly) {
			this.setState({value: nextProps.value});
		}
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


		var actions: React.ComponentElement<any>[] = [];
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
			actions.push(copyButton);
		}

		if (this.props.isPassword) {
			var revealButton = controls.ActionButtonF({
				value: this.state.revealed ? 'Hide' : 'Reveal',
				onClick: (e) => {
					e.preventDefault();
					this.setState({revealed: !this.state.revealed});
				}
			});
			actions.push(revealButton);
		}

		if (!this.props.readOnly && this.props.onDelete) {
			var deleteButton = controls.ActionButtonF({
				value: 'Delete',
				onClick: (e) => {
					e.preventDefault();
					this.props.onDelete();
				}
			});
			actions.push(deleteButton);
		}

		var fieldStyle: text_field.TextFieldStyle = {};
		if (this.props.isPassword) {
			fieldStyle.fontFamily = 'monospace';
		}

		return div(theme.detailsView.field, {ref: 'itemField'},
			text_field.TextFieldF({
				floatingLabel: true,
				placeHolder: this.props.label,
				value: displayValue,
				type: inputType,
				onChange: (e) => {
					var newValue = (<HTMLInputElement>e.target).value;
					this.setState({value: newValue});
					this.props.onChange(newValue);
				},
				readOnly: this.props.readOnly,
				showUnderline: !this.props.readOnly,
				style: fieldStyle
			}),
			div(theme.detailsView.field.actions, {}, actions)
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
	currentUrl: string;

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
			this.setState({itemContent: content});
			this.resetEdits({item: item, content: content});
		}).done();
	}

	private resetEdits(base: item_store.ItemAndContent) {
		var editedItem = item_store.cloneItem(base, base.item.uuid);
		this.setState({editedItem: editedItem});
	}

	private renderSections(item: item_store.ItemAndContent, onSave: () => void, editing: boolean) {
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
						onDelete: () => {
							section.fields.splice(fieldIndex, 1);
							onSave();
						},
						readOnly: !editing
					}));
				}
			});
			sections.push(div(null, {}, section.title));
			sections.push(div(null, {},
			fields)
			);
		});

		return sections;
	}

	private renderWebsites(item: item_store.ItemAndContent, onSave: () => void, editing: boolean) {
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
				onDelete: () => {
					item.content.urls.splice(urlIndex, 1);
					onSave();
				},
				readOnly: !editing
			}));
		});
		
		if (editing) {
			websites.push(controls.ActionButtonF({
				value: 'Add Website',
				onClick: (e) => {
					e.preventDefault();
					this.state.editedItem.content.urls.push({
						label: 'website',
						url: this.props.currentUrl
					});
					onSave();
				}
			}));
		}

		return websites;
	}

	private renderCoreFields(item: item_store.ItemAndContent, onSave: () => void, editing: boolean) {
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
				readOnly: !editing
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
				readOnly: !editing
			}));
		}
		
		return coreFields;
	}

	private renderToolbar() {
		var toolbarControls: React.ReactElement<any>[] = [];
		if (this.props.editMode == ItemEditMode.EditItem && !this.state.isEditing) {
			toolbarControls.push(controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#arrow-back',
				onClick: () => this.props.onGoBack(),
				key: 'back'
			}));
		} else {
			toolbarControls.push(controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#clear',
				onClick: () => {
					if (this.props.editMode == ItemEditMode.EditItem) {
						this.resetEdits({item: this.props.item, content: this.state.itemContent});
						this.setState({isEditing: false, didEditItem: false});
					} else {
						this.props.onGoBack();
					}
				},
				key: 'cancel'
			}));
		}
		toolbarControls.push(div(theme.detailsView.toolbarSpacer,{}));

		var editOrSave: React.ComponentElement<controls.ToolbarButtonProps>;
		if (this.state.isEditing) {
			editOrSave = controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#done',
				onClick: () => {
					if (this.state.didEditItem) {
						this.props.onSave(this.state.editedItem);
					}

					this.setState({
						isEditing: false,
						didEditItem: false
					});

					// go back to main item list after adding a new item
					if (this.props.editMode == ItemEditMode.AddItem) {
						this.props.onGoBack();
					}
				},
				key: 'save',
				style: { position: 'absolute', top: 0 }
			});
		} else {
			editOrSave = controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#edit',
				onClick: () => {
					this.setState({isEditing:true});
				},
				key: 'edit',
				style: { position: 'absolute', top: 0 }
			});
		}
		toolbarControls.push(react.DOM.div(style.mixin([theme.itemList.toolbar.iconGroup, {
				position: 'relative',
				width: 45,
				overflow: 'hidden'
			}]),
			reactutil.CSSTransitionGroupF({transitionName: style.classes(theme.animations.slideFromBottom)},
				editOrSave
			)
		));

		return div([theme.toolbar, theme.detailsView.toolbar], {},
			toolbarControls
		);
	}

	private renderFields(editing: boolean) {
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
			if (editing) {
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

			var coreFields = this.renderCoreFields(updatedItem, onChangeItem, editing);
			var sections = this.renderSections(updatedItem, onChangeItem, editing);
			var websites = this.renderWebsites(updatedItem, onChangeItem, editing);

			var contentKey = 'content';
			if (editing) {
				contentKey += '-editing';
			}

			detailsContent = div(theme.detailsView.content, {key: contentKey},
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

		return detailsContent;
	}

	render() {
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
			div(theme.detailsView.fieldsContainer, {},
				reactutil.CSSTransitionGroupF({transitionName: style.classes(theme.animations.fade)},
					this.renderFields(this.state.isEditing)
				)
			)
		);
	}
}

export var DetailsViewF = reactutil.createFactory(DetailsView, focus_mixin.FocusMixinM);

