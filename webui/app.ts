/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/sprintf.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />
/// <reference path="../typings/fastclick.d.ts" />

import $ = require('jquery');
import fastclick = require('fastclick');
import react = require('react');
import reactts = require('react-typescript');
import sprintf = require('sprintf');
import url = require('url');
import underscore = require('underscore');

import autofill = require('./autofill');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import event_stream = require('../lib/base/event_stream');
import key_agent = require('../lib/key_agent');
import keycodes = require('./base/keycodes');
import key_value_store = require('../lib/base/key_value_store');
import http_vfs = require('../lib/vfs/http');
import item_icons = require('./item_icons');
import item_search = require('../lib/item_search');
import onepass = require('../lib/onepass');
import onepass_crypto = require('../lib/onepass_crypto');
import page_access = require('./page_access');
import reactutil = require('./reactutil');
import shortcut = require('./base/shortcut');
import stringutil = require('../lib/base/stringutil');
import vfs = require('../lib/vfs/vfs');

enum ActiveView {
	UnlockPane,
	ItemList,
	ItemDetailView
}

enum StatusType {
	Error
}

class Status {
	type: StatusType;
	text: string;
}

class StatusViewProps {
	status: Status;
}

/** A status bar for showing app-wide notifications, such
  * as syncing progress, connection errors etc.
  */
class StatusView extends reactts.ReactComponentBase<StatusViewProps, {}> {
	render() {
		return react.DOM.div({className: 'statusView'},
			this.props.status ? this.props.status.text : ''
		);
	}
}

/** The app setup screen. This is responsible for introducing the user
  * to the app and displaying the initial status page when connecting
  * to cloud storage.
  */
class SetupView extends reactts.ReactComponentBase<{}, {}> {
	render() {
		return react.DOM.div({className: 'setupView'},
			react.DOM.div({className: 'loginText'},
				'Connecting to Dropbox...'
			)
		);
	}
}

interface AppViewState {
	mainView?: ActiveView;
	vault?: onepass.Vault;
	items?: onepass.Item[];
	selectedItem?: onepass.Item;
	isLocked?: boolean;
	currentUrl?: string;
	status?: Status;
}

interface AppServices {
	pageAccess: page_access.PageAccess;
	autofiller: autofill.AutoFillHandler;
	iconProvider: item_icons.ItemIconProvider;
	keyAgent: key_agent.SimpleKeyAgent;
	clipboard: page_access.ClipboardAccess;
}

interface AppViewProps {
	services: AppServices;
}

/** The main top-level app view. */
class AppView extends reactts.ReactComponentBase<AppViewProps, AppViewState> {
	stateChanged: event_stream.EventStream<AppViewState>;

	constructor(props: AppViewProps) {
		super(props);

		this.stateChanged = new event_stream.EventStream<AppViewState>();
	}

	getInitialState() {
		var state = {
			mainView: ActiveView.UnlockPane,
			items: <onepass.Item[]>[],
			isLocked: true
		};
		return state;
	}

	setState(changes: AppViewState) {
		var doRefresh = false;
		if (changes.vault && changes.vault != this.state.vault) {
			doRefresh = true;
		}
		if (changes.currentUrl && changes.currentUrl != this.state.currentUrl) {
			changes.selectedItem = null;
		}
		if (changes.isLocked === false) {
			changes.selectedItem = null;
		}
		super.setState(changes);

		if (doRefresh) {
			this.refreshItems();
		}
	}

	componentDidUpdate() {
		this.stateChanged.publish(this.state);
	}

	componentDidMount() {
		var componentDoc = this.getDOMNode().ownerDocument;

		// trigger a refresh of the item list when the view
		// loses focus.
		//
		// It would be preferable to set up a long-poll or
		// other notification to the cloud sync service to
		// pick up changes without requiring the user
		// to hide and re-show the view
		componentDoc.addEventListener('blur', () => {
			// TESTING
			//this.refreshItems();
		});
	}

	refreshItems() {
		if (!this.state.vault) {
			return;
		}
		this.state.vault.listItems().then((items) => {
			var state = this.state;
			state.items = underscore.filter(items, (item) => {
				return item.isRegularItem();
			});
			this.setState(state);
		});
	}

	showError(error: string) {
		this.setState({
			status: {
				type: StatusType.Error,
				text: error
			}
		});
	}

	autofill(item: onepass.Item) {
		this.props.services.autofiller.autofill(item).then((result) => {
			if (result.count > 0) {
				this.props.services.pageAccess.hidePanel();
			}
		}).catch((err) => {
			this.showError(err.message);
		});
	}

	render() : react.ReactComponent<any,any> {
		if (!this.state.vault) {
			return new SetupView({});
		}

		var children : {
			unlockPane?: UnlockPane;
			itemList?: ItemListView;
			itemDetails?: DetailsView;
			statusView?: StatusView;
		} = {};

		if (this.state.isLocked) {
			children.unlockPane = new UnlockPane({
				vault: this.state.vault,
				isLocked: this.state.isLocked,
				onUnlock: () => {
					this.setState({isLocked: false});
				},
				onUnlockErr: (err) => {
					this.showError(err);
				}
			});
		} else {
			children.itemList = new ItemListView({
				items: this.state.items,
				selectedItem: this.state.selectedItem,
				onSelectedItemChanged: (item) => { this.setState({selectedItem: item}); },
				currentUrl: this.state.currentUrl,
				iconProvider: this.props.services.iconProvider,
				onLockClicked: () => this.props.services.keyAgent.forgetKeys()
			});
			children.itemDetails = new DetailsView({
				item: this.state.selectedItem,
				iconProvider: this.props.services.iconProvider,
				onGoBack: () => {
					this.setState({selectedItem: null});
				},
				autofill: () => {
					this.autofill(this.state.selectedItem);
				},
				clipboard: this.props.services.clipboard
			});
		}
		if (this.state.status) {
			children.statusView = new StatusView({
				status: this.state.status
			});
		}

		return react.DOM.div({className: 'appView', ref: 'app'},
			reactutil.mapToComponentArray(children)
		);
	}
}

// View for entering master password and unlocking the vault
enum UnlockState {
	Locked,
	Unlocking,
	Failed,
	Success
}

class UnlockPaneState {
	unlockState: UnlockState;
}

class UnlockPaneProps {
	vault: onepass.Vault;
	isLocked: boolean;
	onUnlock: () => void;
	onUnlockErr: (error: string) => void;
}

class UnlockPane extends reactts.ReactComponentBase<UnlockPaneProps, UnlockPaneState> {
	getInitialState() {
		return new UnlockPaneState();
	}

	componentDidMount() {
		var unlockForm = this.refs['unlockPaneForm'].getDOMNode();
		$(unlockForm).submit((e) => {
			e.preventDefault();

			var unlockField = this.refs['masterPassField'].getDOMNode();
			var masterPass = $(unlockField).val();

			this.setUnlockState(UnlockState.Unlocking);
			this.props.vault.unlock(masterPass).then(() => {
				this.setUnlockState(UnlockState.Success);
				this.props.onUnlock();
			})
			.catch((err) => {
				console.log('Unlocking failed', err.message);
				this.setUnlockState(UnlockState.Failed);
				this.props.onUnlockErr(err);
			});
		});

		var masterPassField = this.refs['masterPassField'].getDOMNode();
		$(masterPassField).focus();
	}

	setUnlockState(unlockState: UnlockState) {
		var state = this.state;
		state.unlockState = unlockState;
		this.setState(state);
	}

	render() {
		if (!this.props.isLocked) {
			return react.DOM.div({});
		}

		var unlockMessage : string;
		if (this.state.unlockState == UnlockState.Unlocking) {
			unlockMessage = 'Unlocking...';
		} else if (this.state.unlockState == UnlockState.Failed) {
			unlockMessage = 'Unlocking failed';
		}

		return react.DOM.div({className: 'unlockPane'},
			react.DOM.div({className:'unlockPaneForm'},
				react.DOM.form({className: 'unlockPaneInputs', ref:'unlockPaneForm'},
					react.DOM.input({
						className: 'masterPassField',
						type: 'password',
						placeholder: 'Master Password...',
						ref: 'masterPassField',
						autoFocus: true
					}),
					react.DOM.div({className: 'unlockLabel'}, unlockMessage)
				)
			)
		);
	}
}

class ToolbarButtonProps {
	iconHref: string;
}

class ToolbarButton extends reactts.ReactComponentBase<ToolbarButtonProps,{}> {
	render() {
		return react.DOM.a(reactutil.mergeProps(this.props, {
			className: 'toolbarLink',
			href: '#',
		}),
		new SvgIcon({
			href: this.props.iconHref,
			width: 20,
			height: 20,
			fill: 'white',
			viewBox: {x: 0, y: 0, width: 22, height: 22}
		}));
	}
}

class SvgIconProps {
	href: string;
	fill: string;
	viewBox: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	width: number;
	height: number;
}

class SvgIcon extends reactts.ReactComponentBase<SvgIconProps, {}> {
	render() {
		return react.DOM.svg(reactutil.mergeProps(this.props, {
			dangerouslySetInnerHTML: {
				__html: sprintf('<use x="0" y="0" fill="%s" xlink:href="%s"></use>',
				  underscore.escape(this.props.fill), underscore.escape(this.props.href))
			},
			viewBox: sprintf('%d %d %d %d', this.props.viewBox.x, this.props.viewBox.y,
			  this.props.viewBox.width, this.props.viewBox.height),
			width: this.props.width,
			height: this.props.height
		}));
	}
}

// Search box to search through items in the view
class ItemListToolbarProps {
	onQueryChanged: (query: string) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onActivate: () => void;
	
	onLockClicked: () => void;
}

class ItemListToolbar extends reactts.ReactComponentBase<ItemListToolbarProps, {}> {
	componentDidMount() {
		var searchField = this.fieldInput();
		var updateQuery = underscore.debounce(() => {
			this.props.onQueryChanged($(searchField).val().toLowerCase());
		}, 100);
		$(searchField).bind('input', <(eventObject: JQueryEventObject) => any>updateQuery);
		$(searchField).keydown((e) => {
			if (e.which == keycodes.DownArrow) {
				e.preventDefault();
				this.props.onMoveDown();
			} else if (e.which == keycodes.UpArrow) {
				e.preventDefault();
				this.props.onMoveUp();
			} else if (e.which == keycodes.Enter) {
				e.preventDefault();
				this.props.onActivate();
			}
		});
	}

	focus() {
		this.fieldInput().focus();
	}

	blur() {
		this.fieldInput().blur();
	}

	private fieldInput() : HTMLElement {
		return <HTMLElement>this.refs['searchField'].getDOMNode();
	}

	render() {
		var iconViewBox = {
			x: 0,
			y: 0,
			width: 20,
			height: 20
		};

		return react.DOM.div({className: stringutil.truthyKeys({itemListToolbar: true, toolbar: true})},
				new SvgIcon({
					className: 'toolbarSearchIcon',
					href: 'icons/icons.svg#search',
					width: 20,
					height: 20,
					viewBox: iconViewBox,
					fill: 'white'
				}),
				react.DOM.input({className: 'searchFieldInput',
					type: 'text',
					placeholder: 'Search items...',
					ref: 'searchField'
				}),
				new ToolbarButton({
					className: 'toolbarLockIcon',
					iconHref: 'icons/icons.svg#lock-outline',
					onClick: () => this.props.onLockClicked()
				})
			);
	}
}

class ItemListViewState {
	filter: string;
}

class ItemListViewProps {
	items: onepass.Item[];
	selectedItem: onepass.Item;
	onSelectedItemChanged: (item: onepass.Item) => void;
	currentUrl: string;
	iconProvider: item_icons.ItemIconProvider;

	onLockClicked: () => void;
}

class ItemListView extends reactts.ReactComponentBase<ItemListViewProps, ItemListViewState> {
	getInitialState() {
		var state = new ItemListViewState();
		return state;
	}

	componentDidMount() {
		this.focusSearchField();
	}

	componentWillReceiveProps(nextProps: ItemListViewProps) {
		if (this.refs['searchField']) {
			if (nextProps.selectedItem) {
				// blur search field to allow keyboard navigation of selected
				// item
				setTimeout(() => {
					this.blurSearchField();
				}, 0);
			} else {
				// no item selected, focus search field to allow item list navigation
				this.focusSearchField();
			}
		}
	}

	updateFilter = (filter: string) => {
		var state = this.state;
		state.filter = filter;
		this.setState(state);
	}

	render() {
		var filterUrl : string;
		if (!this.state.filter && this.props.currentUrl) {
			filterUrl = this.props.currentUrl;
		}
		
		return react.DOM.div({className: 'itemListView'},
			new ItemListToolbar({
				onQueryChanged: this.updateFilter,
				ref: 'searchField',
				onMoveUp: () => {
					(<ItemList>this.refs['itemList']).hoverPrevItem();
				},
				onMoveDown: () => {
					(<ItemList>this.refs['itemList']).hoverNextItem();
				},
				onActivate: () => {
					this.props.onSelectedItemChanged((<ItemList>this.refs['itemList']).hoveredItem());
				},
				onLockClicked: () => this.props.onLockClicked()
			}),
			new ItemList({items: this.props.items, filter: this.state.filter,
				filterUrl: filterUrl,
				onSelectedItemChanged: (item) => {
					if (!item) {
						this.focusSearchField();
					}
					this.props.onSelectedItemChanged(item);
				},
				ref: 'itemList',
				iconProvider: this.props.iconProvider
			})
		);
	}

	private focusSearchField() {
		var searchField: ItemListToolbar = <any>this.refs['searchField'];
		searchField.focus();
	}

	private blurSearchField() {
		var searchField: ItemListToolbar = <any>this.refs['searchField'];
		searchField.blur();
	}
}

interface ActionButtonProps {
	value: string;
	onClick: (e: MouseEvent) => void;
}

class ActionButton extends reactts.ReactComponentBase<ActionButtonProps,{}> {
	render() {
		return react.DOM.input(reactutil.mergeProps(this.props, {
			className: 'itemActionButton',
			type: 'button'
		}));
	}
}

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

		var revealButton: ActionButton;
		if (this.props.isPassword) {
			revealButton = new ActionButton({
				value: this.state.revealed ? 'Hide' : 'Reveal',
				onClick: (e) => {
					e.preventDefault();
					this.setState({revealed: !this.state.revealed});
				}
			})
		}

		if (this.state.selected) {
			var copyButton: ActionButton;
			if (this.props.clipboard.clipboardAvailable()) {
				copyButton = new ActionButton({
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

// Detail view for an individual item
class DetailsViewProps {
	item: onepass.Item;
	iconProvider: item_icons.ItemIconProvider;
	clipboard: page_access.ClipboardAccess;

	onGoBack: () => any;
	autofill: () => void;
}

class ItemSectionProps {
	title: string;
	type: onepass.FormFieldType
	value: string;
}

class DetailsView extends reactts.ReactComponentBase<DetailsViewProps, {}> {
	private itemContent : onepass.ItemContent;
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
			this.forceUpdate();
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
							isPassword: false,
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
					new ItemIcon({
						item: this.props.item,
						iconProvider: this.props.iconProvider,
						visible: true
					}),
					react.DOM.div({className: 'detailsOverview'},
						react.DOM.div({className: 'detailsTitle'}, this.props.item.title),
						react.DOM.div({className: 'detailsLocation'},
							react.DOM.a({href: this.props.item.location},
								itemDomain(this.props.item)
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
				new ToolbarButton({
					iconHref: 'icons/icons.svg#arrow-back',
					onClick: () => this.props.onGoBack()
				})),
				react.DOM.div({className: 'itemActionBar'},
					new ActionButton({
						accessKey:'a',
						value: 'Autofill',
						onClick: () => this.props.autofill()
					})
				),
			detailsContent ? detailsContent : []
		);
	}
}

class ItemIconProps {
	item: onepass.Item;
	iconProvider: item_icons.ItemIconProvider;
	visible: boolean;
}

class ItemIcon extends reactts.ReactComponentBase<ItemIconProps, {}> {
	private iconUpdateListener: (url: string) => void;

	private setupIconUpdateListener(iconProvider: item_icons.ItemIconProvider) {
		if (!this.iconUpdateListener) {
			this.iconUpdateListener = (url) => {
				if (this.props.item && this.props.iconProvider.updateMatches(url, this.props.item.location)) {
					this.forceUpdate();
				}
			};
		}
		if (this.props.iconProvider) {
			this.props.iconProvider.updated.ignore(this.iconUpdateListener);
		}
		iconProvider.updated.listen(this.iconUpdateListener);
	}

	componentDidMount() {
		if (!this.iconUpdateListener) {
			this.setupIconUpdateListener(this.props.iconProvider);
		}
	}

	componentWillReceiveProps(nextProps: ItemProps) {
		this.setupIconUpdateListener(nextProps.iconProvider);
	}

	render() {
		var iconUrl: string;
		if (this.props.visible) {
			iconUrl = this.props.iconProvider.query(this.props.item.location).iconUrl;
		} else {
			iconUrl = '';
		}

		return react.DOM.div({className: 'itemIconContainer'},
			react.DOM.img({className: 'itemIcon', src: iconUrl})
		);
	}
}

// Item in the overall view
interface ItemState {
}

class ItemProps {
	key: string;
	item: onepass.Item;
	accountName: string;
	domain: string;
	onSelected: () => void;
	isHovered: boolean;
	iconProvider: item_icons.ItemIconProvider;
	visible: boolean;
}

class Item extends reactts.ReactComponentBase<ItemProps, ItemState> {
	getInitialState() {
		return {};
	}

	render() {
		return react.DOM.div({
				className: stringutil.truthyKeys({
					itemOverview: true,
					itemHovered: this.props.isHovered,
					itemVisible: this.props.visible
				}),
				ref: 'itemOverview',
				onClick: () => this.props.onSelected()
			},
			new ItemIcon({
				item: this.props.item,
				iconProvider: this.props.iconProvider,
				visible: this.props.visible
			}),
			react.DOM.div({className: 'itemDetails'},
				react.DOM.div({className: 'itemTitle'}, this.props.item.title),
				react.DOM.div({className: 'itemLocation'}, this.props.domain),
				react.DOM.div({className: 'itemAccount'}, this.props.accountName)
			)
		);
	}
}

interface ItemListState {
	// TODO - Remove selected item here
	selectedItem?: onepass.Item;

	hoveredIndex?: number;
	matchingItems?: onepass.Item[];

	visibleIndexes? : {
		first: number;
		last: number;
	};
}

class ItemListProps {
	items: onepass.Item[];
	filter: string;
	filterUrl: string;
	onSelectedItemChanged: (item: onepass.Item) => void;
	iconProvider: item_icons.ItemIconProvider;
}

class ItemList extends reactts.ReactComponentBase<ItemListProps, ItemListState> {

	itemAccount(item: onepass.Item) : string {
		// TODO - Extract item contents and save account name
		// for future use
		//
		// In the Agile Keychain format it is only available
		// after the item has been decrypted
		return '';
	}

	setSelectedItem(item: onepass.Item) {
		var state = this.state;
		state.selectedItem = item;
		this.setState(state);
		this.props.onSelectedItemChanged(item);
	}

	getInitialState() {
		return {
			selectedItem: <onepass.Item>null,
			hoveredIndex: 0,
			matchingItems: <onepass.Item[]>[],
		};
	}

	createListItem(item: onepass.Item, state: {
		hovered: boolean;
		visible: boolean
	}) : Item {
		return new Item({
			key: item.uuid,
			item: item,
			accountName: this.itemAccount(item),
			domain: itemDomain(item),
			onSelected: () => {
				this.setSelectedItem(item);
			},
			isHovered: state.hovered,
			iconProvider: this.props.iconProvider,
			ref: item.uuid,
			visible: state.visible
		});
	}

	hoverNextItem() {
		if (this.state.hoveredIndex < this.state.matchingItems.length-1) {
			++this.state.hoveredIndex;
			this.setState(this.state);
		}
	}

	hoverPrevItem() {
		if (this.state.hoveredIndex > 0) {
			--this.state.hoveredIndex;
			this.setState(this.state);
		}
	}

	hoveredItem() {
		if (this.state.hoveredIndex < this.state.matchingItems.length) {
			return this.state.matchingItems[this.state.hoveredIndex];
		}
		return null;
	}

	componentDidMount() {
		this.updateMatchingItems(this.props);
		this.updateVisibleItems();
	}

	componentDidUpdate() {
		this.updateVisibleItems();
	}

	componentWillReceiveProps(nextProps: ItemListProps) {
		this.updateMatchingItems(nextProps);
	}

	render() {
		var listItems = this.state.matchingItems.map((item, index) => {
			var isVisible = false;
			if (this.state.visibleIndexes) {
				isVisible = index >= this.state.visibleIndexes.first &&
				            index <= this.state.visibleIndexes.last;
			}
			return this.createListItem(item, {
				hovered: index == this.state.hoveredIndex,
				visible: isVisible
			});
		});
		
		return react.DOM.div({
			className: 'itemList',
			ref: 'itemList',
			onScroll: (e) => {
				this.updateVisibleItems()
			}
		},
			listItems
		);
	}

	private updateVisibleItems() {
		var itemList = <HTMLElement>this.refs['itemList'].getDOMNode();
		if (this.state.matchingItems.length > 0) {
			var topIndex: number = -1;
			var bottomIndex: number = -1;

			var itemListRect = itemList.getBoundingClientRect();

			for (var i=0; i < this.state.matchingItems.length; i++) {
				var item = <HTMLElement>this.refs[this.state.matchingItems[i].uuid].getDOMNode();
				var itemRect = item.getBoundingClientRect();

				if (topIndex == -1 && itemRect.bottom >= itemListRect.top) {
					topIndex = i;
				}
				if (topIndex != -1) {
					bottomIndex = i;
				}
					
				if (itemRect.bottom > itemListRect.bottom) {
					break;
				}
			}

			if (!this.state.visibleIndexes ||
			     topIndex != this.state.visibleIndexes.first ||
				 bottomIndex != this.state.visibleIndexes.last) {

				this.setState({
					visibleIndexes: {
						first: topIndex,
						last: bottomIndex
					}
				});
			}
		}
	}

	private updateMatchingItems(props: ItemListProps) {
		var prevHoveredItem = this.hoveredItem();
		var matchingItems: onepass.Item[] = [];
		var matchesAreSorted = false;

		if (props.filter) {
			matchingItems = underscore.filter(props.items, (item) => {
				return item_search.matchItem(item, props.filter);
			});
		} else if (props.filterUrl) {
			matchingItems = item_search.filterItemsByUrl(props.items, props.filterUrl);
			if (matchingItems.length > 0) {
				matchesAreSorted = true;
			} else {
				// if no items appear to match this URL, show the
				// complete list and let the user browse or filter
				matchingItems = props.items;
			}
		} else {
			matchingItems = props.items;
		}

		if (!matchesAreSorted) {
			matchingItems.sort((a, b) => {
				return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
			});
		}

		var nextHoveredIndex = matchingItems.indexOf(prevHoveredItem);
		if (nextHoveredIndex == -1) {
			nextHoveredIndex = 0;
		}

		this.state.hoveredIndex = nextHoveredIndex;
		this.state.matchingItems = matchingItems;
		this.setState(this.state);
	}
}

function itemDomain(item: onepass.Item) : string {
	var itemURL = item.location;

	if (!itemURL) {
		return null;
	}

	var parsedUrl = url.parse(itemURL);
	return parsedUrl.host;
}

declare var firefoxAddOn: page_access.ExtensionConnector;

export class App {
	private appView: AppView;
	private savedState: AppViewState;
	private services: AppServices;

	constructor() {
		this.savedState = {};

		// VFS setup
		var fs: vfs.VFS;
		if (env.isFirefoxAddon()) {
			if (firefoxAddOn.syncService === 'dropbox') {
				fs = new dropboxvfs.DropboxVFS({
					authMode: dropboxvfs.AuthMode.Redirect,
					authRedirectUrl: firefoxAddOn.oauthRedirectUrl,
					disableLocationCleanup: true,
					receiverPage: ''
				});
			} else if (firefoxAddOn.syncService === 'httpfs') {
				fs = new http_vfs.Client('http://localhost:3030');
			}
		} else if (env.isChromeExtension()) {
			fs = new dropboxvfs.DropboxVFS({
				authMode: dropboxvfs.AuthMode.ChromeExtension,
				authRedirectUrl: '',
				disableLocationCleanup: true,
				receiverPage: 'data/chrome_dropbox_oauth_receiver.html'
			});
		}

		if (!fs) {
			var opts = <any>url.parse(document.location.href, true /* parse query */).query;
			if (opts.httpfs) {
				fs = new http_vfs.Client(opts.httpfs);
			} else {
				fs = new dropboxvfs.DropboxVFS();
			}
		}

		var pageAccess: page_access.PageAccess;
		var clipboard: page_access.ClipboardAccess;

		if (typeof firefoxAddOn != 'undefined') {
			var extensionPageAccess = new page_access.ExtensionPageAccess(firefoxAddOn);
			pageAccess = extensionPageAccess;
			clipboard = extensionPageAccess;
		} else if (env.isChromeExtension()) {
			var chromePageAccess = new page_access.ChromeExtensionPageAccess();
			pageAccess = chromePageAccess;
			clipboard = chromePageAccess;
		} else {
			pageAccess = new page_access.ExtensionPageAccess(new page_access.FakeExtensionConnector());
			clipboard = {
				copy: (mimeType: string, data: string) => {
					/* no-op */
				},
				clipboardAvailable : () => {
					return false;
				}
			};
		}

		var keyAgent = new key_agent.SimpleKeyAgent();
		keyAgent.setAutoLockTimeout(2 * 60 * 1000);

		var iconDiskCache = new key_value_store.IndexedDBStore('passcards', 'icon-cache');
		this.services = {
			iconProvider: new item_icons.ItemIconProvider(iconDiskCache, pageAccess.siteInfoProvider(), 48),
			autofiller: new autofill.AutoFiller(pageAccess),
			pageAccess: pageAccess,
			keyAgent: keyAgent,
			clipboard: clipboard
		};

		onepass_crypto.CryptoJsCrypto.initWorkers();

		pageAccess.showEvents.listen(() => {
			// in the Firefox add-on the active element loses focus when dismissing the
			// panel by focusing another UI element such as the URL input bar.
			//
			// Restore focus to the active element when the panel is shown again
			if (document.activeElement) {
				(<HTMLElement>document.activeElement).focus();
			}
		});

		fs.login().then(() => {
			try {
				var vault = new onepass.Vault(fs, '/1Password/1Password.agilekeychain', this.services.keyAgent);
				this.updateState({vault: vault});

				this.services.keyAgent.onLock().listen(() => {
					this.updateState({isLocked: true});
				});

				pageAccess.pageChanged.listen((url) => {
					this.updateState({currentUrl: url});
				});
			} catch (err) {
				console.log('vault setup failed', err, err.stack);
			}
		}).catch((err) => {
			this.appView.showError(err.toString());
			console.log('Failed to setup vault', err.toString());
		});
	}

	renderInto(element: HTMLElement) {
		var rootInputElement = element.ownerDocument.body;

		// setup touch input
		fastclick.FastClick.attach(rootInputElement);

		// setup auto-lock
		$(rootInputElement).keydown((e) => {
			this.services.keyAgent.resetAutoLock();
		});
		$(rootInputElement).mousedown((e) => {
			this.services.keyAgent.resetAutoLock();
		});

		// create main app view
		this.appView = new AppView({services: this.services});
		this.appView.stateChanged.listen((state) => {
			// save app state for when the app's view is mounted
			// via renderInto()
			this.savedState = underscore.clone(state);
		});
		react.renderComponent(this.appView, element);
		this.updateState(this.savedState);
	}

	private updateState(state: AppViewState) {
		if (this.appView) {
			this.appView.setState(state);
		} else {
			// save app state for when the app's view is mounted
			// via renderInto()
			underscore.extend(this.savedState, state);
		}
	}
}

