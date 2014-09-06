/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />
/// <reference path="../typings/fastclick.d.ts" />

import $ = require('jquery');
import fastclick = require('fastclick');
import react = require('react');
import reactts = require('react-typescript');
import url = require('url');
import underscore = require('underscore');

import autofill = require('./autofill');
import controls = require('./controls');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import event_stream = require('../lib/base/event_stream');
import key_agent = require('../lib/key_agent');
import keycodes = require('./base/keycodes');
import key_value_store = require('../lib/base/key_value_store');
import http_vfs = require('../lib/vfs/http');
import item_icons = require('./item_icons');
import item_list = require('./item_list');
import onepass = require('../lib/onepass');
import onepass_crypto = require('../lib/onepass_crypto');
import page_access = require('./page_access');
import reactutil = require('./reactutil');
import shortcut = require('./base/shortcut');
import siteinfo_client = require('../lib/siteinfo/client');
import stringutil = require('../lib/base/stringutil');
import vfs = require('../lib/vfs/vfs');
import url_util = require('../lib/base/url_util');

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
			itemList?: item_list.ItemListView;
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
			children.itemList = new item_list.ItemListView({
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
							isPassword: field.kind == onepass.FieldType.Password,
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
						location: this.props.item.location,
						iconProvider: this.props.iconProvider,
						visible: true
					}),
					react.DOM.div({className: 'detailsOverview'},
						react.DOM.div({className: 'detailsTitle'}, this.props.item.title),
						react.DOM.div({className: 'detailsLocation'},
							react.DOM.a({href: this.props.item.location},
								url_util.domain(this.props.item.location)
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

		var siteInfoProvider = new siteinfo_client.PasscardsClient();

		var iconDiskCache = new key_value_store.IndexedDBStore('passcards', 'icon-cache');
		this.services = {
			iconProvider: new item_icons.ItemIconProvider(iconDiskCache, siteInfoProvider, 48),
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

