/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import button = require('./controls/button');
import colors = require('./controls/colors');
import crypto = require('../lib/onepass_crypto');
import env = require('../lib/base/env');
import focus_mixin = require('./base/focus_mixin');
import item_builder = require('../lib/item_builder');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
import keycodes = require('./base/keycodes');
import menu = require('./controls/menu');
import page_access = require('./page_access');
import reactutil = require('./base/reactutil');
import shortcut = require('./base/shortcut');
import style_util = require('./base/style_util');
import text_field = require('./controls/text_field');
import theme = require('./theme');
import toolbar = require('./toolbar');
import url_util = require('../lib/base/url_util');

enum FieldType {
	Text,
	Password,
	Url
}

interface ItemFieldState {
	selected?: boolean;
	revealed?: boolean;
	value?: string;
}

interface ItemFieldProps {
	label: string;
	value: string;
	type: FieldType;
	clipboard: page_access.ClipboardAccess;
	readOnly: boolean;

	// if true, auto-focus the field on load
	focused?: boolean;

	deleteLabel?: string;

	onChangeLabel?(newValue: string) : boolean;
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
		if (this.props.type == FieldType.Password && !this.state.revealed) {
			inputType = 'password';
		}
		if (this.props.type == FieldType.Url) {
			inputType = 'url';
		}


		var actions: React.ComponentElement<any>[] = [];
		if (this.state.selected) {
			var copyButton: React.ComponentElement<button.ButtonProps>;
			if (this.props.clipboard.clipboardAvailable()) {
				copyButton = button.ButtonF({
					style: button.Style.Rectangular,
					value: 'Copy',
					key: 'copy',
					onClick: (e) => {
						this.props.clipboard.copy('text/plain', this.props.value)
					}
				});
			}
			actions.push(copyButton);

			if (this.props.type == FieldType.Password) {
				var revealButton = button.ButtonF({
					style: button.Style.Rectangular,
					value: this.state.revealed ? 'Hide' : 'Reveal',
					key: 'reveal',
					onClick: (e) => {
						e.preventDefault();
						this.setState({revealed: !this.state.revealed});
					}
				});
				actions.push(revealButton);

				if (!this.props.readOnly) {
					var generateButton = button.ButtonF({
						style: button.Style.Rectangular,
						color: colors.MATERIAL_COLOR_PRIMARY,
						value: 'Generate',
						key: 'generate',
						onClick: (e) => {
							var newPassword = crypto.generatePassword(12);
							this.setState({revealed: true});
							this.props.onChange(newPassword);
						}
					});
					actions.push(generateButton);
				}
			}
		}

		if (this.state.selected && !this.props.readOnly && this.props.onDelete) {
			var deleteButton = button.ButtonF({
				style: button.Style.Rectangular,
				value: this.props.deleteLabel || 'Delete',
				key: 'delete',
				color: colors.MATERIAL_RED_P400,
				onClick: (e) => {
					e.preventDefault();
					this.props.onDelete();
				}
			});
			actions.push(deleteButton);
		}

		var fieldStyle: text_field.TextFieldStyle = {};
		if (this.props.type == FieldType.Password) {
			fieldStyle.fontFamily = 'monospace';
		}

		var focusField = this.props.focused;
		var labelEditor: React.ReactElement<text_field.TextFieldProps>;
		if (this.props.onChangeLabel) {
			labelEditor = text_field.TextFieldF({
				floatingLabel: true,
				placeHolder: 'Field Title',
				onChange: (e) => {
					var newValue = (<HTMLInputElement>e.target).value;
					this.props.onChangeLabel(newValue);
				},
				focus: focusField
			});

			// when editing the label, autofocus the label editor,
			// not the field value
			focusField = false;
		}

		return react.DOM.div(style.mixin(theme.detailsView.field, {ref: 'itemField'}),
			labelEditor,
			text_field.TextFieldF({
				floatingLabel: this.props.onChangeLabel == null,
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
				style: fieldStyle,
				focus: focusField,
				ref: 'textField'
			}),
			react.DOM.div(style.mixin(theme.detailsView.field.actions), actions)
		);
	}
}

var ItemFieldF = reactutil.createFactory(ItemField);

export enum ItemEditMode {
	AddItem,
	EditItem
}

export interface DetailsViewProps {
	entryRect?: reactutil.Rect;
	viewportRect: reactutil.Rect;

	item: item_store.Item;
	iconProvider: item_icons.IconProvider;
	clipboard: page_access.ClipboardAccess;
	editMode: ItemEditMode;
	focus: boolean;
	currentUrl: string;

	onGoBack: () => any;
	onSave: (updates: item_store.ItemAndContent) => any;
	autofill: () => void;
}

interface AddingFieldState {
	section: item_store.ItemSection;
	pos: {
		left: number;
		top: number;
	}
}

interface DetailsViewState {
	itemContent?: item_store.ItemContent;
	editedItem?: item_store.ItemAndContent;
	isEditing?: boolean;
	didEditItem?: boolean;
	transition?: reactutil.TransitionState;

	autofocusField?: any; /* item_store.ItemField | item_store.ItemUrl | item_store.ItemSection */

	addingField?: AddingFieldState;
	editingFieldLabel?: item_store.ItemField;
}

export class DetailsView extends typed_react.Component<DetailsViewProps, DetailsViewState> {
	private shortcuts: shortcut.Shortcut[];
	private transitionHandler: reactutil.TransitionEndListener;

	getInitialState() {
		var isEditing = this.props.editMode === ItemEditMode.AddItem;

		return {
			isEditing: isEditing,
			didEditItem: isEditing,
			transition: reactutil.TransitionState.Entering
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
		var root = <HTMLElement>this.getDOMNode();
		this.shortcuts = [
			new shortcut.Shortcut(root, keycodes.Backspace, () => {
				this.exit();
			}),
			new shortcut.Shortcut(root, keycodes.a, () => {
				this.props.autofill();
			})
		];
		
		if (this.state.transition !== reactutil.TransitionState.Entered) {
			setTimeout(() => {
				this.setState({transition: reactutil.TransitionState.Entered});
			}, 10);
		}

		this.transitionHandler = new reactutil.TransitionEndListener(this, 'top', () => {
			if (this.state.transition === reactutil.TransitionState.Leaving) {
				this.props.onGoBack();
			}
		});
	}

	componentDidUnmount() {
		this.shortcuts.forEach((shortcut) => {
			shortcut.remove();
		});
		this.shortcuts = [];
		this.transitionHandler.remove();
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
				var autofocus = this.state.autofocusField === field;
				var labelChangeHandler: (newValue: string) => boolean;
				if (field === this.state.editingFieldLabel) {
					labelChangeHandler = (newValue) => {
						field.title = newValue;
						onSave();
						return true;
					}
				}

				fields.push(ItemFieldF({
					key: section.name + '.' + field.name,
					label: field.title,
					value: field.value,
					type: field.kind == item_store.FieldType.Password ? FieldType.Password : FieldType.Text,
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
					onChangeLabel: labelChangeHandler,
					readOnly: !editing,
					focused: autofocus
				}));
			});
			if (sectionIndex > 0) {
				sections.push(react.DOM.div(style.mixin(theme.detailsView.section.divider)));
			}
			if (section.title || editing) {
				if (editing) {
					var autofocus = this.state.autofocusField === section;
					sections.push(ItemFieldF({
						key: section.name + '.title',
						label: 'Section Title',
						deleteLabel: 'Delete Section',
						value: section.title,
						type: FieldType.Text,
						clipboard: this.props.clipboard,
						onChange: (newValue) => {
							section.title = newValue;
							onSave();
							return true;
						},
						onDelete: () => {
							item.content.sections.splice(sectionIndex, 1);
							onSave();
						},
						readOnly: false,
						focused: autofocus
					}));
				} else {
					sections.push(react.DOM.div(style.mixin(theme.detailsView.section.title),
						section.title)
					);
				}
			}

			sections.push(react.DOM.div({},
				fields
			));

			if (editing) {
				var addButtonRef = sectionIndex + '.addField';
				sections.push(button.ButtonF({
					style: button.Style.Rectangular,
					value: 'Add Field',
					color: colors.MATERIAL_COLOR_PRIMARY,
					ref: addButtonRef,
					onClick: (e) => {
						var buttonRect = (<HTMLElement>this.refs[addButtonRef].getDOMNode()).getBoundingClientRect();
						this.setState({addingField: {
							pos: {
								top: buttonRect.top,
								left: buttonRect.left
							},
							section: section
						}});
					}
				}));
			}
		});

		if (editing) {
			sections.push(button.ButtonF({
				style: button.Style.Rectangular,
				value: 'Add Section',
				color: colors.MATERIAL_COLOR_PRIMARY,
				onClick: () => {
					var newSection = new item_store.ItemSection();
					newSection.name = crypto.newUUID();
					newSection.title = 'New Section';
					item.content.sections.push(newSection);
					
					this.setState({autofocusField: newSection});
					this.onChangeItem();
				}
			}));
		}

		return sections;
	}

	private renderWebsites(item: item_store.ItemAndContent, onSave: () => void, editing: boolean) {
		var websites: React.ComponentElement<any>[] = [];
		item.content.urls.forEach((url, urlIndex) => {
			var autofocus = this.state.autofocusField === url;
			websites.push(ItemFieldF({
				key: urlIndex,
				label: url.label,
				value: url.url,
				type: FieldType.Url,
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
				readOnly: !editing,
				focused: autofocus
			}));
		});
		
		if (editing) {
			websites.push(button.ButtonF({
				value: 'Add Website',
				style: button.Style.Rectangular,
				color: colors.MATERIAL_COLOR_PRIMARY,
				onClick: (e) => {
					var newUrl = {
						label: 'website',
						url: this.props.currentUrl
					};
					this.state.editedItem.content.urls.push(newUrl);
					this.setState({autofocusField: newUrl});
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
				type: FieldType.Text,
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
				type: FieldType.Password,
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

	private renderMenus() {
		var addField = (type: item_store.FieldType) => {
			var field = new item_store.ItemField();
			field.kind = type;
			field.value = '';
			field.name = crypto.newUUID();
			field.title = 'New Field';

			this.setState({
				autofocusField: field,
				editingFieldLabel: field
			});
			this.state.addingField.section.fields.push(field);
			this.onChangeItem();
		};

		var fieldTypes = [{
			label: 'Text',
			onClick: () => {
				addField(item_store.FieldType.Text);
			}
		},{
			label: 'Password',
			onClick: () => {
				addField(item_store.FieldType.Password);
			}
		}];

		var newFieldMenu: React.ReactElement<menu.MenuProps>;
		if (this.state.addingField) {
			newFieldMenu = menu.MenuF({
				items: fieldTypes,
				sourceRect: {
					top: this.state.addingField.pos.top,
					left: this.state.addingField.pos.left,
					right: this.state.addingField.pos.left,
					bottom: this.state.addingField.pos.top
				},
				viewportRect: this.props.viewportRect,
				onDismiss: () => {
					this.setState({addingField: null});
				},
				zIndex: 1
			});
		}

		return reactutil.TransitionGroupF({}, newFieldMenu);
	}

	private renderToolbar() {
		var toolbarControls: React.ReactElement<any>[] = [];
		if (this.props.editMode == ItemEditMode.EditItem && !this.state.isEditing) {
			toolbarControls.push(toolbar.createButton({
				value: 'Back',
				iconUrl: 'dist/icons/icons.svg#arrow-back',
				onClick: () => {
					this.exit();
				},
				key: 'back'
			}));
		} else {
			toolbarControls.push(toolbar.createButton({
				value: 'Cancel',
				iconUrl: 'dist/icons/icons.svg#clear',
				onClick: () => {
					if (this.props.editMode == ItemEditMode.EditItem) {
						this.resetEdits({item: this.props.item, content: this.state.itemContent});
						this.setState({isEditing: false, didEditItem: false});
					} else {
						this.exit();
					}
				},
				key: 'cancel'
			}));
		}
		toolbarControls.push(react.DOM.div(style.mixin(theme.detailsView.toolbarSpacer)));

		var editOrSave: React.ComponentElement<button.ButtonProps>;
		if (this.state.isEditing) {
			editOrSave = toolbar.createButton({
				value: 'Save',
				iconUrl: 'dist/icons/icons.svg#done',
				onClick: () => {
					if (this.state.didEditItem) {
						this.props.onSave(this.state.editedItem);
					}

					this.setState({
						isEditing: false,
						didEditItem: false,
						editingFieldLabel: null
					});

					// go back to main item list after adding a new item
					if (this.props.editMode == ItemEditMode.AddItem) {
						this.props.onGoBack();
					}
				},
				key: 'save',
			});
		} else {
			editOrSave = toolbar.createButton({
				value: 'Edit',
				iconUrl: 'dist/icons/icons.svg#edit',
				onClick: () => {
					this.setState({isEditing:true});
				},
				key: 'edit',
			});
		}
		toolbarControls.push(react.DOM.div(style.mixin([theme.itemList.toolbar.iconGroup, {
				position: 'relative',
				width: 45,
				overflow: 'hidden'
			}]),
			editOrSave
		));

		return react.DOM.div(style.mixin(theme.detailsView.header.toolbar),
			toolbarControls
		);
	}

	private onChangeItem() {
		var updatedItem = this.state.editedItem;
		updatedItem.item.updateOverviewFromContent(updatedItem.content);
		this.setState({
			editedItem: updatedItem,
			didEditItem: true
		});
	}

	private renderFields(editing: boolean) {
		var detailsContent : React.ReactElement<any>;
		var updatedItem = this.state.editedItem;
		if (updatedItem) {
			var onChangeItem = () => {
				this.onChangeItem();
			};

			var titleField: React.ReactElement<any>;
			if (editing) {
				titleField = ItemFieldF({
					label: 'Title',
					value: updatedItem.item.title,
					type: FieldType.Text,
					clipboard: this.props.clipboard,
					onChange: (newValue) => {
						updatedItem.item.title = newValue;
						onChangeItem();
						return true;
					},
					readOnly: false
				});
			}

			var coreFields = this.renderCoreFields(updatedItem, onChangeItem, editing);
			var sections = this.renderSections(updatedItem, onChangeItem, editing);
			var websites = this.renderWebsites(updatedItem, onChangeItem, editing);

			var contentKey = 'content';
			if (editing) {
				contentKey += '-editing';
			}

			var sectionDivider: React.ReactElement<any>;
			if (websites.length > 0 && sections.length > 0) {
				sectionDivider = react.DOM.div(style.mixin(theme.detailsView.divider));
			}

			var itemActionDivider: React.ReactElement<any>;
			var itemActions: React.ComponentElement<any>[] = [];
			if (editing && this.props.editMode === ItemEditMode.EditItem) {
				var isTrashed = updatedItem.item.trashed;
				itemActions.push(button.ButtonF({
					style: button.Style.Rectangular,
					color: isTrashed ? colors.MATERIAL_COLOR_PRIMARY : colors.MATERIAL_RED_P400,
					value: isTrashed ? 'Restore from Trash' : 'Move to Trash',
					onClick: () => {
						updatedItem.item.trashed = !isTrashed;
						onChangeItem();
					}
				}));
			}

			if (itemActions.length > 0) {
				itemActionDivider = react.DOM.div(style.mixin(theme.detailsView.divider));
			}

			detailsContent = react.DOM.div(style.mixin(theme.detailsView.content, {key: contentKey}),
				titleField,
				react.DOM.div(style.mixin(theme.detailsView.coreFields), coreFields),
				react.DOM.div({}, websites),
				sectionDivider,
				react.DOM.div({}, sections),
				itemActionDivider,
				react.DOM.div({}, itemActions)
			);
		}

		return detailsContent;
	}

	private exit() {
		this.setState({transition: reactutil.TransitionState.Leaving});
	}

	render() {
		var viewStyles: any[] = [];
		viewStyles.push(theme.detailsView.container);

		// expand the details view starting from the rect
		// for the selected item
		if (this.state.transition !== reactutil.TransitionState.Entered) {
			if (this.props.entryRect) {
				viewStyles.push({
					left: this.props.entryRect.left,
					width: (this.props.entryRect.right - this.props.entryRect.left),
					top: this.props.entryRect.top,
					height: (this.props.entryRect.bottom - this.props.entryRect.top)
				});
			} else {
				viewStyles.push({
					left: 0,
					width: '100%',
					top: 100,
					height: 0
				});
			}
		} else {
			viewStyles.push({
				left: 0,
				width: '100%',
				top: 0,
				height: '100%'
			});
		}

		var headerStyles: any[] = [];
		headerStyles.push(theme.detailsView.header);

		if (this.state.transition === reactutil.TransitionState.Entered) {
			headerStyles.push(theme.detailsView.header.entered);
		}

		var headerTheme = theme.detailsView.header;
		var itemListDetailsStyle: any[] = [headerTheme.iconAndDetails.details.itemList];
		var detailsViewDetailsStyle: any[] = [headerTheme.iconAndDetails.details.detailsView];

		var contentStyles: React.CSSProperties[] = [{
			paddingTop: 16,

			// vertically align left edge of details text with item
			// title
			//
			// <16px> [Icon (48px)] <16px> [Item Title]
			//
			paddingLeft: 80,
			opacity: 0,
			transition: style_util.transitionOn({opacity: .5}),
			overflowY: 'auto',
			flexGrow: 1
		}];

		if (this.state.transition === reactutil.TransitionState.Entered) {
			itemListDetailsStyle.push({opacity: 0});
			detailsViewDetailsStyle.push({opacity: 1});
			contentStyles.push({opacity: 1});
		}

		var autofillButton: React.ComponentElement<any>;
		var autofillSupported = env.isFirefoxAddon() || env.isChromeExtension();
		if (!this.state.isEditing && autofillSupported) {
			autofillButton = react.DOM.div(style.mixin({
				position: 'absolute',
				right: 16,
				bottom: 16
			}), button.ButtonF({
				style: button.Style.FloatingAction,
				accessKey:'a',
				backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
				color: colors.MATERIAL_COLOR_HEADER,
				rippleColor: 'white',
				onClick: () => this.props.autofill(),
				value: 'Autofill',
				iconUrl: 'dist/icons/icons.svg#input'
			}));
		}

		var updatedItem: item_store.Item;
		if (this.state.editedItem) {
			updatedItem = this.state.editedItem.item;
		} else {
			updatedItem = this.props.item;
		}

		return react.DOM.div(style.mixin(viewStyles, {tabIndex: 0}),
			react.DOM.div(style.mixin(headerStyles),
				this.renderToolbar(),
				this.renderMenus(),
				react.DOM.div(style.mixin(headerTheme.iconAndDetails),
					item_icons.IconControlF({
						location: updatedItem.primaryLocation(),
						iconProvider: this.props.iconProvider,
						isFocused: true,
						onClick: () => {
							var url = url_util.normalize(updatedItem.primaryLocation());
							var siteWindow = window.open(url, '_blank');
							siteWindow.focus();
						},
						title: `Open ${updatedItem.primaryLocation()} in a new tab`
					}),
					react.DOM.div(style.mixin(headerTheme.iconAndDetails.details),
						// item title and account at start of entry transition
						react.DOM.div(style.mixin(itemListDetailsStyle),
							react.DOM.div(style.mixin(theme.itemList.item.details.title), updatedItem.title),
							react.DOM.div(style.mixin(theme.itemList.item.details.account), updatedItem.account)
						),
						// item title and account at end of entry transition
						react.DOM.div(style.mixin(detailsViewDetailsStyle),
							react.DOM.div(style.mixin(theme.detailsView.header.title), updatedItem.title),
							react.DOM.div(style.mixin(theme.detailsView.header.account), updatedItem.account)
						)
					)
				)
			),
			react.DOM.div(style.mixin(contentStyles),
				autofillButton,
				this.renderFields(this.state.isEditing)
			)
		);
	}
}

export var DetailsViewF = reactutil.createFactory(DetailsView, focus_mixin.FocusMixinM);

