/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />
/// <reference path="../typings/fastclick.d.ts" />
/// <reference path="../typings/react.addons.d.ts" />

import $ = require('jquery');
import fastclick = require('fastclick');
import react = require('react');
import react_addons = require('react/addons');
import reactts = require('react-typescript');
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
}

/** The main top-level app view. */
class AppView extends reactts.ReactComponentBase<AppViewProps, AppViewState> {
	stateChanged: event_stream.EventStream<AppViewState>;

	constructor(props: AppViewProps) {
		super(props);

		this.stateChanged = new event_stream.EventStream<AppViewState>();
	}

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

	componentDidUnmount() {
		if (this.state.syncer) {
			this.state.syncer.onProgress.ignore(this.state.syncListener);
		}
	}

	setState(changes: AppViewState) {
		var doRefresh = false;
		if (changes.currentUrl && changes.currentUrl != this.state.currentUrl) {
			changes.selectedItem = null;
		}
		if (this.state.isLocked && changes.isLocked === false) {
			changes.selectedItem = null;
			doRefresh = true;
		}
		if (changes.syncer) {
			if (this.state.syncer) {
				this.state.syncer.onProgress.ignore(this.state.syncListener);
			}
			changes.syncer.onProgress.listen(this.state.syncListener);
		}
		// listen for updates to items in the store
		if (changes.store) {
			var debouncedRefresh = underscore.debounce(() => {
				this.refreshItems()
			}, 300);
			changes.store.onItemUpdated.listen(debouncedRefresh);
		}
		super.setState(changes);

		if (doRefresh) {
			this.refreshItems();
		}
	}

	componentDidUpdate() {
		this.stateChanged.publish(this.state);
	}

	refreshItems() {
		if (!this.state.store || this.state.isLocked) {
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

	render() : react.ReactComponent<any,any> {
		if (!this.state.store) {
			return new SetupView({});
		}

		var children : {
			unlockPane?: UnlockPane;
			itemList?: item_list.ItemListView;
			itemDetails?: details_view.DetailsView;
			statusView?: StatusView;
			toaster?: react.ReactComponent<any,any>;
			menu?: controls.Menu;
		} = {};

		if (this.state.isLocked) {
			children.unlockPane = new UnlockPane({
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
			children.itemList = new item_list.ItemListView({
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
			children.itemDetails = new details_view.DetailsView({
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

		var toasters: controls.Toaster[] = [];
		if (this.state.status) {
			toasters.push(new controls.Toaster({
				message: this.state.status.text
			}));
		}
		if (this.state.syncState &&
		    this.state.syncState.state !== sync.SyncState.Idle) {
			toasters.push(new controls.Toaster({
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
		return new controls.Menu({
			items: menuItems,
			   top: 5,
			   right: 5,
			   onDismiss: () => {
				   this.setState({showMenu: false});
			   }
		});
	}
}

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

		// the main item list only renders visible items,
		// so force a re-render when the window size changes
		rootInputElement.onresize = () => {
			this.appView.forceUpdate();
		};
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
