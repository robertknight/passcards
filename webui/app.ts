/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/fastclick.d.ts" />
/// <reference path="../typings/react-0.12.d.ts" />

import $ = require('jquery');
import fastclick = require('fastclick');
import react = require('react');
import react_addons = require('react/addons');
import typed_react = require('typed-react');
import url = require('url');
import underscore = require('underscore');

import autofill = require('./autofill');
import controls = require('./controls');
import details_view = require('./details_view');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import event_stream = require('../lib/base/event_stream');
import http_vfs = require('../lib/vfs/http');
import item_icons = require('./item_icons');
import item_list = require('./item_list');
import item_store = require('../lib/item_store');
import key_agent = require('../lib/key_agent');
import key_value_store = require('../lib/base/key_value_store');
import local_store = require('../lib/local_store');
import onepass = require('../lib/onepass');
import onepass_crypto = require('../lib/onepass_crypto');
import page_access = require('./page_access');
import reactutil = require('./reactutil');
import siteinfo_client = require('../lib/siteinfo/client');
import sync = require('../lib/sync');
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
class StatusView extends typed_react.Component<StatusViewProps, {}> {
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
class SetupView extends typed_react.Component<{}, {}> {
	render() {
		return react.DOM.div({className: 'setupView'},
			react.DOM.div({className: 'loginText'},
				'Connecting to Dropbox...'
			)
		);
	}
}

var SetupViewF = reactutil.createFactory(SetupView);

// View for entering master password and unlocking the store
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
	store: item_store.Store;
	isLocked: boolean;
	onUnlock: () => void;
	onUnlockErr: (error: string) => void;
}

class UnlockPane extends typed_react.Component<UnlockPaneProps, UnlockPaneState> {
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
			this.props.store.unlock(masterPass).then(() => {
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

var UnlockPaneF = reactutil.createFactory(UnlockPane);

interface AppViewState {
	mainView?: ActiveView;

	store?: item_store.Store;
	syncer?: sync.Syncer;
	items?: item_store.Item[];

	selectedItem?: item_store.Item;
	isLocked?: boolean;
	currentUrl?: string;

	status?: Status;
	syncState?: sync.SyncProgress;
	syncListener?: event_stream.EventListener<sync.SyncProgress>;
	showMenu?: boolean;
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
	stateChanged: event_stream.EventStream<AppViewState>;
}

/** The main top-level app view. */
class AppView extends typed_react.Component<AppViewProps, AppViewState> {
	getInitialState() {
		var syncListener = (progress: sync.SyncProgress) => {
			this.setState({ syncState: progress });
		};

		var state = {
			mainView: ActiveView.UnlockPane,
			items: <item_store.Item[]>[],
			isLocked: true,
			syncListener: syncListener
		};
		return state;
	}

	componentDidMount() {
		this.componentWillUpdate(this.props, this.state);
	}

	componentDidUnmount() {
		if (this.state.syncer) {
			this.state.syncer.onProgress.ignore(this.state.syncListener);
		}
	}

	componentWillUpdate(nextProps: AppViewProps, nextState: AppViewState) {
		var doRefresh = false;

		if (nextState.currentUrl !== this.state.currentUrl) {
			nextState.selectedItem = null;
		}

		if (nextState.isLocked !== this.state.isLocked &&
			nextState.isLocked === false) {
			nextState.selectedItem = null;
			doRefresh = true;
		}

		if (nextState.syncer !== this.state.syncer) {
			if (this.state.syncer) {
				this.state.syncer.onProgress.ignore(this.state.syncListener);
			}
			nextState.syncer.onProgress.listen(this.state.syncListener);
		}

		// listen for updates to items in the store
		if (nextState.store !== this.state.store) {
			var debouncedRefresh = underscore.debounce(() => {
				if (this.state.store && !this.state.isLocked) {
					this.refreshItems()
				}
			}, 300);

			if (this.state.store) {
				this.state.store.onItemUpdated.ignoreContext(this);
			}
			nextState.store.onItemUpdated.listen(debouncedRefresh, this);
		}

		if (doRefresh) {
			this.refreshItems();
		}
	}

	componentDidUpdate() {
		this.props.stateChanged.publish(this.state);
	}

	private refreshItems() {
		if (!this.state.store) {
			return;
		}
		this.state.store.listItems().then((items) => {
			var state = this.state;
			state.items = underscore.filter(items, (item) => {
				return item.isRegularItem() && !item.trashed;
			});
			this.setState(state);
		}).catch((err) => {
			console.log('Error listing items: ', err);
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

	autofill(item: item_store.Item) {
		this.props.services.autofiller.autofill(item).then((result) => {
			if (result.count > 0) {
				this.props.services.pageAccess.hidePanel();
			}
		}).catch((err) => {
			this.showError(err.message);
		});
	}

	render() : react.Descriptor<any> {
		if (!this.state.store) {
			return SetupViewF({});
		}

		var children : {
			unlockPane?: react.Descriptor<UnlockPaneProps>;
			itemList?: react.Descriptor<item_list.ItemListViewProps>;
			itemDetails?: react.Descriptor<details_view.DetailsViewProps>;
			statusView?: react.Descriptor<StatusViewProps>;
			toaster?: react.Descriptor<any>;
			menu?: react.Descriptor<controls.MenuProps>;
		} = {};

		if (this.state.isLocked) {
			children.unlockPane = UnlockPaneF({
				store: this.state.store,
				isLocked: this.state.isLocked,
				onUnlock: () => {
					this.setState({isLocked: false});
				},
				onUnlockErr: (err) => {
					this.showError(err);
				}
			});
		} else {
			children.itemList = item_list.ItemListViewF({
				items: this.state.items,
				selectedItem: this.state.selectedItem,
				onSelectedItemChanged: (item) => { this.setState({selectedItem: item}); },
				currentUrl: this.state.currentUrl,
				iconProvider: this.props.services.iconProvider,
				onLockClicked: () => this.props.services.keyAgent.forgetKeys(),
				onMenuClicked: () => {
					this.setState({showMenu: true});
				}
			});
			children.itemDetails = details_view.DetailsViewF({
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

		var toasters: react.Descriptor<controls.ToasterProps>[] = [];
		if (this.state.status) {
			toasters.push(controls.ToasterF({
				message: this.state.status.text
			}));
		}
		if (this.state.syncState &&
		    this.state.syncState.state !== sync.SyncState.Idle) {
			toasters.push(controls.ToasterF({
				message: 'Syncing...',
				progressValue: this.state.syncState.updated,
				progressMax: this.state.syncState.total
			}));
		}

		if (this.state.showMenu) {
			children.menu = this.renderMenu();
		}

		children.toaster = react_addons.addons.CSSTransitionGroup({transitionName: 'fade'},
		  toasters
		);

		return react.DOM.div({className: 'appView', ref: 'app'},
			reactutil.mapToComponentArray(children)
		);
	}

	private renderMenu() {
		var menuItems: controls.MenuItem[] = [{
			label: 'Clear Offline Storage',
			onClick: () => {
				return this.props.services.keyAgent.forgetKeys().then(() => {
					return this.state.store.clear();
				}).then(() => {
					console.log('Re-syncing keys');
					return this.state.syncer.syncKeys();
				}).catch((err) => {
					this.showError(err);
				});
			}
		},{
			label: 'Help',
			onClick: () => {
				var win = window.open('https://robertknight.github.io/passcards', '_blank');
				win.focus();
			}
		}];
		return controls.MenuF({
			items: menuItems,
			   top: 5,
			   right: 5,
			   onDismiss: () => {
				   this.setState({showMenu: false});
			   }
		});
	}
}

var AppViewF = reactutil.createFactory(AppView);

declare var firefoxAddOn: page_access.ExtensionConnector;

export class App {
	// a reference to the rendered AppView instance
	private activeAppView: any;

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
		var iconDiskCache = new key_value_store.IndexedDBDatabase();
		iconDiskCache.open('passcards', 1 /* version */, (schemaModifier) => {
			schemaModifier.createStore('icon-cache');
		});

		this.services = {
			iconProvider: new item_icons.ItemIconProvider(iconDiskCache.store('icon-cache'), siteInfoProvider, 48),
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

		// update the initial URL when the app is loaded
		this.updateState({currentUrl: pageAccess.currentUrl});

		fs.login().then(() => {
			try {
				var itemDatabase = new key_value_store.IndexedDBDatabase();
				var vault = new onepass.Vault(fs, '/1Password/1Password.agilekeychain', this.services.keyAgent);
				var store = new local_store.Store(itemDatabase, this.services.keyAgent);
				var syncer = new sync.Syncer(store, vault);
				syncer.syncKeys().then(() => {
					console.log('Encryption keys synced')
				}).catch((err) => {
					console.log('Failed to sync encryption keys: %s', err);
				});

				store.onUnlock.listen(() => {
					syncer.syncItems();
				});

				this.updateState({
					store: store,
					syncer: syncer
				});

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
			this.activeAppView.showError(err.toString());
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
		var stateChanged = new event_stream.EventStream<AppViewState>();
		var appView = AppViewF({
			services: this.services,
			stateChanged: stateChanged
		});
		stateChanged.listen((state: AppViewState) => {
			// save app state for when the app's view is mounted
			// via renderInto()
			this.savedState = underscore.clone(state);
		});
		this.activeAppView = react.render(appView, element);
		this.updateState(this.savedState);

		// the main item list only renders visible items,
		// so force a re-render when the window size changes
		rootInputElement.onresize = () => {
			this.activeAppView.forceUpdate();
		};
	}

	private updateState(state: AppViewState) {
		if (this.activeAppView) {
			this.activeAppView.setState(state);
		} else {
			// save app state for when the app's view is mounted
			// via renderInto()
			underscore.extend(this.savedState, state);
		}
	}
}
