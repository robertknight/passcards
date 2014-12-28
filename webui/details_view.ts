/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import controls = require('./controls/controls');
import crypto = require('../lib/onepass_crypto');
import div = require('./base/div');
import env = require('../lib/base/env');
import focus_mixin = require('./base/focus_mixin');
import item_builder = require('../lib/item_builder');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
import keycodes = require('./base/keycodes');
import page_access = require('./page_access');
import reactutil = require('./base/reactutil');
import shortcut = require('./base/shortcut');
import style_util = require('./base/style_util');
import text_field = require('./controls/text_field');
import theme = require('./theme');
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
			var copyButton: React.ComponentElement<controls.ActionButtonProps>;
			if (this.props.clipboard.clipboardAvailable()) {
				copyButton = controls.ActionButtonF({
					value: 'Copy',
					key: 'copy',
					onClick: (e) => {
						this.props.clipboard.copy('text/plain', this.props.value)
					}
				});
			}
			actions.push(copyButton);

			if (this.props.type == FieldType.Password) {
				var revealButton = controls.ActionButtonF({
					value: this.state.revealed ? 'Hide' : 'Reveal',
					key: 'reveal',
					onClick: (e) => {
						e.preventDefault();
						this.setState({revealed: !this.state.revealed});
					}
				});
				actions.push(revealButton);

				if (!this.props.readOnly) {
					var generateButton = controls.ActionButtonF({
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

		if (!this.props.readOnly && this.props.onDelete) {
			var deleteButton = controls.ActionButtonF({
				value: 'Delete',
				key: 'delete',
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
	entryRect: reactutil.Rect;

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

// describes whether we are entering or exiting the
// details view. The state is initially 'Entering' and
// transitions to 'Idle' a moment afterwards.
enum TransitionState {
	Entering,
	Idle,
	Exiting
}

interface DetailsViewState {
	itemContent?: item_store.ItemContent;
	editedItem?: item_store.ItemAndContent;
	isEditing?: boolean;
	didEditItem?: boolean;
	transition?: TransitionState;
}

export class DetailsView extends typed_react.Component<DetailsViewProps, DetailsViewState> {
	private shortcuts: shortcut.Shortcut[];

	getInitialState() {
		return {
			isEditing: this.props.editMode === ItemEditMode.AddItem,
			didEditItem: false,
			transition: TransitionState.Entering
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
		
		if (this.state.transition !== TransitionState.Idle) {
			setTimeout(() => {
				this.setState({transition: TransitionState.Idle});
			}, 10);
		}

		root.addEventListener('transitionend', (e: TransitionEvent) => {
			if (e.target === root && e.propertyName === 'top') {
				if (this.state.transition === TransitionState.Exiting) {
					this.props.onGoBack();
				}
			}
		}, false);

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

	private renderToolbar() {
		var toolbarControls: React.ReactElement<any>[] = [];
		if (this.props.editMode == ItemEditMode.EditItem && !this.state.isEditing) {
			toolbarControls.push(controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#arrow-back',
				onClick: () => {
					this.exit();
				},
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
						this.exit();
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

		return div([theme.detailsViewHero.header.toolbar], {},
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

			var itemActions: React.ComponentElement<any>[] = [];
			if (editing && this.props.editMode === ItemEditMode.EditItem) {
				var isTrashed = updatedItem.item.trashed;
				itemActions.push(controls.ActionButtonF({
					value: isTrashed ? 'Restore from Trash' : 'Move to Trash',
					onClick: () => {
						updatedItem.item.trashed = !isTrashed;
						onChangeItem();
					}
				}));
			}

			var mainItemUrl = url_util.normalize(updatedItem.item.primaryLocation());

			detailsContent = div(theme.detailsView.content, {key: contentKey},
				titleField,
				div(theme.detailsView.coreFields, {}, coreFields),
				div(null, {}, websites),
				div(null, {}, sections),
				div(null, {}, itemActions)
			);
		}

		return detailsContent;
	}

	private exit() {
		this.setState({transition: TransitionState.Exiting});
	}

	render() {
		var viewStyles: any[] = [];
		viewStyles.push(theme.detailsViewHero.container);

		if (this.state.transition !== TransitionState.Idle) {
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
				top: 0,
				height: '100%'
			});
			viewStyles.push(theme.mixins.materialDesign.card);
		}

		var headerStyles: any[] = [];
		headerStyles.push(theme.detailsViewHero.header);

		if (this.state.transition === TransitionState.Idle) {
			headerStyles.push(theme.detailsViewHero.header.entered);
		}

		var toolbarControls: React.ReactElement<any>[] = [];
		toolbarControls.push(controls.ToolbarButtonF({
			iconHref: 'icons/icons.svg#clear',
			onClick: () => {
				this.exit();
			},
			key: 'cancel'
		}));

		var detailsLeftPadding = theme.itemList.item.details.padding;
		var itemListDetailsStyle: React.CSSProperties[] = [{
			position: 'absolute',
			left: detailsLeftPadding,
			right: 0,
			top: 0,
			bottom: 0,
			transition: style_util.transitionOn({opacity: .2}),
			opacity: 1
		}];

		var detailsViewDetailsStyle: React.CSSProperties[] = [{
			position: 'absolute',
			left: detailsLeftPadding,
			right: 0,
			top: 0,
			bottom: 0,
			color: 'white',
			transition: style_util.transitionOn({opacity: .2}),
			opacity: 0,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center'
		}];

		var contentStyles: React.CSSProperties[] = [{
			paddingTop: 16,
			opacity: 0,
			transition: style_util.transitionOn({opacity: .5}),
			overflowY: 'auto',
			flexGrow: 1
		}];

		if (this.state.transition === TransitionState.Idle) {
			itemListDetailsStyle.push({opacity: 0});
			detailsViewDetailsStyle.push({opacity: 1});
			contentStyles.push({opacity: 1});
		}

		var autofillButton: React.ComponentElement<any>;
		if (env.isFirefoxAddon() || env.isChromeExtension()) {
			autofillButton = controls.ActionButtonF({
				accessKey:'a',
				value: 'Autofill',
				onClick: () => this.props.autofill()
			});
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
				react.DOM.div(style.mixin(theme.detailsViewHero.header.iconAndDetails),
					item_icons.IconControlF({
						location: this.props.item.primaryLocation(),
						iconProvider: this.props.iconProvider,
						isFocused: true
					}),
					react.DOM.div(style.mixin(theme.detailsViewHero.header.details),
						react.DOM.div(style.mixin(itemListDetailsStyle),
							react.DOM.div(style.mixin(theme.itemList.item.details.title), updatedItem.title),
							react.DOM.div(style.mixin(theme.itemList.item.details.account), updatedItem.account)
						),
						react.DOM.div(style.mixin(detailsViewDetailsStyle),
							react.DOM.div(style.mixin(theme.detailsViewHero.header.title), updatedItem.title),
							react.DOM.div(style.mixin(theme.detailsViewHero.header.account), updatedItem.account)
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

