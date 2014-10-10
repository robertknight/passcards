/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />

import react = require('react');
import reactts = require('react-typescript');

import controls = require('./controls');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
import keycodes = require('./base/keycodes');
import page_access = require('./page_access');
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

class ItemField extends reactts.ReactComponentBase<ItemFieldProps, ItemFieldState> {
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

		var fieldActions: react.ReactComponent<any,any>;

		var revealButton: controls.ActionButton;
		if (this.props.isPassword) {
			revealButton = new controls.ActionButton({
				value: this.state.revealed ? 'Hide' : 'Reveal',
				onClick: (e) => {
					e.preventDefault();
					this.setState({revealed: !this.state.revealed});
				}
			})
		}

		if (this.state.selected) {
			var copyButton: controls.ActionButton;
			if (this.props.clipboard.clipboardAvailable()) {
				copyButton = new controls.ActionButton({
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

class DetailsViewProps {
	item: item_store.Item;
	iconProvider: item_icons.ItemIconProvider;
	clipboard: page_access.ClipboardAccess;

	onGoBack: () => any;
	autofill: () => void;
}

export class DetailsView extends reactts.ReactComponentBase<DetailsViewProps, {}> {
	private itemContent : item_store.ItemContent;
	private shortcuts: shortcut.Shortcut[];

	componentWillReceiveProps(nextProps: DetailsViewProps) {
		if (!nextProps.item) {
			return;
		}

		if (!this.props.item || this.props.item != nextProps.item) {
			// forget previous item content when switching items
			this.itemContent = null;
		}

		nextProps.item.getContent().then((content) => {
			// TODO - Cache content and avoid using forceUpdate()
			this.itemContent = content;
			if (this.isMounted()) {
				this.forceUpdate();
			}
		}).done();
	}

	componentDidUpdate() {
		this.updateShortcutState();
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

	render() {
		var detailsContent : react.ReactComponent<any,any>;
		if (this.props.item && this.itemContent) {
			var account = this.itemContent.account();
			var password = this.itemContent.password();
			var coreFields: react.ReactComponent<any,any>[] = [];
			var websites: react.ReactComponent<any,any>[] = [];
			var sections: react.ReactComponent<any,any>[] = [];

			this.itemContent.sections.forEach((section) => {
				var fields: react.ReactComponent<any,any>[] = [];
				section.fields.forEach((field) => {
					if (field.value) {
						fields.push(new ItemField({
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

			this.itemContent.urls.forEach((url) => {
				websites.push(new ItemField({
					label: url.label,
					value: url.url,
					isPassword: false,
					clipboard: this.props.clipboard
				}));
			});

			if (account) {
				coreFields.push(new ItemField({
					label: 'Account',
					value: account,
					isPassword: false,
					clipboard: this.props.clipboard
				}));
			}

			if (password) {
				coreFields.push(new ItemField({
					label: 'Password',
					value: password,
					isPassword: true,
					clipboard: this.props.clipboard
				}));
			}

			detailsContent = react.DOM.div({className: 'detailsContent'},
				react.DOM.div({className: 'detailsHeader'},
					new item_icons.IconControl({
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

		return react.DOM.div({
			className: stringutil.truthyKeys({
					detailsView: true,
					hasSelectedItem: this.props.item
				}),
			ref: 'detailsView',
			tabIndex: 0
			},
			react.DOM.div({className: stringutil.truthyKeys({toolbar: true, detailsToolbar: true})},
				new controls.ToolbarButton({
					iconHref: 'icons/icons.svg#arrow-back',
					onClick: () => this.props.onGoBack()
				})),
				react.DOM.div({className: 'itemActionBar'},
					new controls.ActionButton({
						accessKey:'a',
						value: 'Autofill',
						onClick: () => this.props.autofill()
					})
				),
			detailsContent ? detailsContent : []
		);
	}
}

