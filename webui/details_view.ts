/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');

import controls = require('./controls');
import env = require('../lib/base/env');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
import keycodes = require('./base/keycodes');
import page_access = require('./page_access');
import reactutil = require('./reactutil');
import shortcut = require('./base/shortcut');
import stringutil = require('../lib/base/stringutil');
import url_util = require('../lib/base/url_util');

interface ItemFieldState {
	selected?: boolean;
	revealed?: boolean;
}

class ItemFieldProps {
	label: string;
	value: string;
	isPassword: boolean;
	clipboard: page_access.ClipboardAccess;
}

class ItemField extends typed_react.Component<ItemFieldProps, ItemFieldState> {
	getInitialState() {
		return {
			selected: false,
			revealed: false
		};
	}

	render() {
		var displayValue = this.props.value;
		if (this.props.isPassword && !this.state.revealed) {
			displayValue = stringutil.repeat('•', this.props.value.length);
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
			react.DOM.div({className: 'detailsFieldLabel'}, this.props.label),
			react.DOM.div({
				className: stringutil.truthyKeys({
					detailsFieldValue: true,
					concealedFieldValue: this.props.isPassword
				}),
				onClick: (e) => {
					e.preventDefault();
					this.setState({selected: !this.state.selected})
				}
			}, displayValue),
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
	onSave: () => any;
	autofill: () => void;
}

interface DetailsViewState {
	itemContent?: item_store.ItemContent
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
			this.setState({itemContent: null});
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
			this.setState({itemContent: content});
		}).done();
	}

	render() {
		var detailsContent : react.Descriptor<any>;
		if (this.props.item && this.state.itemContent) {
			var account = this.state.itemContent.account();
			var password = this.state.itemContent.password();
			var coreFields: react.Descriptor<any>[] = [];
			var websites: react.Descriptor<any>[] = [];
			var sections: react.Descriptor<any>[] = [];

			this.state.itemContent.sections.forEach((section, sectionIndex) => {
				var fields: react.Descriptor<any>[] = [];
				section.fields.forEach((field, fieldIndex) => {
					if (field.value) {
						fields.push(ItemFieldF({
							key: sectionIndex + '.' + fieldIndex,
							label: field.title,
							value: field.value,
							isPassword: field.kind == item_store.FieldType.Password,
							clipboard: this.props.clipboard
						}));
					}
				});
				sections.push(react.DOM.div({className: 'detailsSection'},
					fields)
				);
			});

			this.state.itemContent.urls.forEach((url, urlIndex) => {
				websites.push(ItemFieldF({
					key: urlIndex,
					label: url.label,
					value: url.url,
					isPassword: false,
					clipboard: this.props.clipboard
				}));
			});

			if (account) {
				coreFields.push(ItemFieldF({
					key: 'account',
					label: 'Account',
					value: account,
					isPassword: false,
					clipboard: this.props.clipboard
				}));
			}

			if (password) {
				coreFields.push(ItemFieldF({
					key: 'password',
					label: 'Password',
					value: password,
					isPassword: true,
					clipboard: this.props.clipboard
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
						react.DOM.div({className: 'detailsTitle'}, this.props.item.title),
						react.DOM.div({className: 'detailsLocation'},
							react.DOM.a({href: this.props.item.primaryLocation()},
								url_util.domain(this.props.item.primaryLocation())
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
			toolbarControls.push(react.DOM.div({className:'toolbarSpacer'})),
			toolbarControls.push(controls.ToolbarButtonF({
				iconHref: 'icons/icons.svg#done',
				onClick: () => {
					this.props.onSave();
					this.props.onGoBack();
				},
				key: 'save'
			}));
		}

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

