/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/fastclick.d.ts" />
/// <reference path="../typings/react-0.12.d.ts" />
/// <reference path="../typings/react-style.d.ts" />
/// <reference path="../node_modules/ts-style/dist/ts-style.d.ts" />

import assert = require('assert');
import fastclick = require('fastclick');
import Q = require('q');
import react = require('react');
import react_style = require('react-style');
import style = require('ts-style');
import typed_react = require('typed-react');
import url = require('url');
import underscore = require('underscore');

import autofill = require('./autofill');
import controls = require('./controls');
import details_view = require('./details_view');
import div = require('./base/div');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import event_stream = require('../lib/base/event_stream');
import http_vfs = require('../lib/vfs/http');
import item_builder = require('../lib/item_builder');
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
import theme = require('./theme');
import vfs = require('../lib/vfs/vfs');
import unlock_view = require('./unlock_view');
import url_util = require('../lib/base/url_util');

enum ActiveView {
	UnlockPane,
	ItemList,
	ItemDetailView
}

enum StatusType {
	Success,
	Error
}

class Status {
	type: StatusType;
	text: string;

	expired: event_stream.EventStream<void>;

	constructor(type: StatusType, text: string) {
		var DEFAULT_TIMEOUT = 2000;
		this.type = type;
		this.text = text;
		this.expired = new event_stream.EventStream<void>();
		setTimeout(() => {
			this.expired.publish(null);
		}, DEFAULT_TIMEOUT);
	}
}

/** The app setup screen. This is responsible for introducing the user
  * to the app and displaying the initial status page when connecting
  * to cloud storage.
  */
class SetupView extends typed_react.Component<{}, {}> {
	render() {
		return div(theme.setupView, {},
			div(null, {},
				'Connecting to Dropbox...'
			)
		);
	}
}

var SetupViewF = reactutil.createFactory(SetupView);

interface AppViewState {
	mainView?: ActiveView;

	store?: item_store.Store;
	syncer?: sync.Syncer;
	items?: item_store.Item[];

	selectedItem?: item_store.Item;
	itemEditMode?: details_view.ItemEditMode;
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
			syncListener: syncListener,
			itemEditMode: details_view.ItemEditMode.EditItem
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
					this.refreshItems();
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

	showError(error: Error) {
		assert(error.message);

		var status = new Status(StatusType.Error, error.message);
		this.showStatus(status);
		console.log('App error:', error.message, error.stack);
	}

	showStatus(status: Status) {
		status.expired.listen(() => {
			if (this.state.status == status) {
				this.setState({status: null});
			}
		});

		this.setState({status: status});
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

	private setSelectedItem(item: item_store.Item) {
		var state = <AppViewState>{selectedItem: item};
		if (item) {
			if (item.isSaved()) {
				state.itemEditMode = details_view.ItemEditMode.EditItem;
			} else {
				state.itemEditMode = details_view.ItemEditMode.AddItem;
			}
		}
		this.setState(state);
	}

	render() : React.ReactElement<any> {
		if (!this.state.store) {
			return SetupViewF({});
		}

		var children: React.ComponentElement<any>[] = [];

		children.push(unlock_view.UnlockViewF({
			key: 'unlockPane',
			store: this.state.store,
			isLocked: this.state.isLocked,
			focus: this.state.isLocked,
			onUnlock: () => {
				this.setState({isLocked: false});
			},
			onUnlockErr: (err) => {
				this.showError(err);
			}
		}));

		children.push(this.renderItemList());
		children.push(this.renderItemDetails());
		children.push(this.renderToasters());

		if (this.state.showMenu) {
			children.push(this.renderMenu('menu'));
		}

		return div(theme.appView, {ref: 'app'},
			children
		);
	}

	private renderToasters() {
		var toasters: React.ComponentElement<controls.ToasterProps>[] = [];
		if (this.state.status) {
			toasters.push(controls.ToasterF({
				key: 'status-toaster',
				message: this.state.status.text
			}));
		}
		if (this.state.syncState &&
		    this.state.syncState.state !== sync.SyncState.Idle) {
			toasters.push(controls.ToasterF({
				key: 'sync-toaster',
				message: 'Syncing...',
				progressValue: this.state.syncState.updated,
				progressMax: this.state.syncState.total
			}));
		}
		return reactutil.CSSTransitionGroupF({transitionName: style.classes(theme.animations.fade), key: 'toasterList'},
		  toasters
		);
	}

	private renderItemList() {
		return item_list.ItemListViewF({
			key: 'itemList',
			ref: 'itemList',
			items: this.state.items,
			selectedItem: this.state.selectedItem,
			onSelectedItemChanged: (item) => { this.setSelectedItem(item); },
			currentUrl: this.state.currentUrl,
			iconProvider: this.props.services.iconProvider,
			onLockClicked: () => this.props.services.keyAgent.forgetKeys(),
			onMenuClicked: () => {
				this.setState({showMenu: true});
			},
			focus: !this.state.isLocked && !this.state.selectedItem
		});
	}

	private renderItemDetails() {
		var detailsViewTransition: string;
		if (this.state.itemEditMode == details_view.ItemEditMode.EditItem) {
			detailsViewTransition = style.classes(theme.animations.slideFromLeft);
		} else {
			detailsViewTransition = style.classes(theme.animations.slideFromBottom);
		}

		var detailsView: React.ComponentElement<any>;
		if (this.state.selectedItem) {
			detailsView = details_view.DetailsViewF({
				key: 'detailsView',
				item: this.state.selectedItem,
				editMode: this.state.itemEditMode,
				iconProvider: this.props.services.iconProvider,
				onGoBack: () => {
					this.setSelectedItem(null);
				},
				onSave: (updatedItem) => {
					// defer saving the item until the details view has
					// transitioned out
					var SAVE_DELAY = 1000;
					Q.delay(SAVE_DELAY).then(() => {
						return updatedItem.item.saveTo(this.state.store);
					}).then(() => {
						return this.state.syncer.syncItems();
					}).then(() => {
						this.showStatus(new Status(StatusType.Success, 'Changes saved and synced'))
					}).catch((err) => {
						this.showError(err);
					});
				},
				autofill: () => {
					this.autofill(this.state.selectedItem);
				},
				clipboard: this.props.services.clipboard,
				focus: this.state.selectedItem != null
			});
		}
		return reactutil.CSSTransitionGroupF({
			transitionName: detailsViewTransition,
			key: 'detailsViewContainer'
		},
			detailsView ? [detailsView] : []
		);
	}

	private createNewItemTemplate() {
		// use the most common account (very likely the user's email address)
		// as the default account login for new items
		var accountFreq: {[id:string]: number} = {};
		this.state.items.forEach((item) => {
			if (!accountFreq.hasOwnProperty(item.account)) {
				accountFreq[item.account] = 1;
			} else {
				++accountFreq[item.account];
			}
		});

		var defaultAccount: string;
		Object.keys(accountFreq).forEach((account) => {
			if (!defaultAccount || accountFreq[account] > accountFreq[defaultAccount]) {
				defaultAccount = account;
			}
		});
		if (!defaultAccount) {
			// TODO - Use the user's Dropbox login if there is no
			// default account set
			defaultAccount = '';
		}

		var randomPassword = onepass_crypto.generatePassword(12);
		var builder = new item_builder.Builder(item_store.ItemTypes.LOGIN)
		  .addLogin(defaultAccount)
		  .addPassword(randomPassword);

		if (this.state.currentUrl) {
			builder.setTitle(url_util.topLevelDomain(this.state.currentUrl));
			builder.addUrl(this.state.currentUrl);
		} else {
			builder.setTitle('New Login');
		}

		return builder.item();
	}

	private renderMenu(key: string) {
		var menuItems: controls.MenuItem[] = [{
			label: 'Add Item',
			onClick: () => {
				this.setSelectedItem(this.createNewItemTemplate());
			},
		},{
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
			key: key,
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

interface BrowserExtension {
	pageAccess: page_access.PageAccess;
	clipboard: page_access.ClipboardAccess;
}

export class App {
	// a reference to the rendered AppView instance
	private activeAppView: any;

	private savedState: AppViewState;
	private services: AppServices;

	constructor() {
		this.savedState = {};

		var fs = this.setupVfs();
		var browserExt = this.setupBrowserExtension();

		var keyAgent = new key_agent.SimpleKeyAgent();
		keyAgent.setAutoLockTimeout(2 * 60 * 1000);

		var iconProvider = this.setupItemIconProvider();
		
		this.services = {
			iconProvider: iconProvider,
			autofiller: new autofill.AutoFiller(browserExt.pageAccess),
			pageAccess: browserExt.pageAccess,
			keyAgent: keyAgent,
			clipboard: browserExt.clipboard
		};

		onepass_crypto.CryptoJsCrypto.initWorkers();

		browserExt.pageAccess.showEvents.listen(() => {
			// in the Firefox add-on the active element loses focus when dismissing the
			// panel by focusing another UI element such as the URL input bar.
			//
			// Restore focus to the active element when the panel is shown again
			if (document.activeElement) {
				(<HTMLElement>document.activeElement).focus();
			}
		});

		// update the initial URL when the app is loaded
		this.updateState({currentUrl: browserExt.pageAccess.currentUrl});

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

				browserExt.pageAccess.pageChanged.listen((url) => {
					this.updateState({currentUrl: url});
				});
			} catch (err) {
				console.log('vault setup failed', err, err.stack);
			}
		}).catch((err) => {
			this.activeAppView.showError(err);
			console.log('Failed to setup vault', err.toString());
		});
	}

	/** Render the app into the given HTML element.
	 *
	 * In the web app and the Firefox extension this is only
	 * invoked once when the app starts.
	 *
	 * In the Chrome extension
	 * this is invoked each time the user opens the extension's
	 * popup from the toolbar, since a new window is created
	 * each time the popup is opened and terminated when the
	 * popup is closed.
	 */
	renderInto(element: HTMLElement) {
		var rootInputElement = element.ownerDocument.body;
		react_style.inject();

		// react_style.inject() will add CSS for compiled styles to
		// a <style> element for 'document'.
		//
		// In a Chrome extension, the app is rendered into an element
		// in a popup view which belongs to a different document (element.ownerDocument)
		// than the background page (document). In this case, copy the <style>
		// from the background page document to the popup view document.
		if (element.ownerDocument !== document) {
			var styleNode = document.querySelector('style');
			var styleNodeCopy = styleNode.cloneNode(true /* deep copy */);
			element.ownerDocument.adoptNode(styleNodeCopy);
			element.ownerDocument.querySelector('head').appendChild(styleNodeCopy);
		}

		// setup touch input
		fastclick.FastClick.attach(rootInputElement);

		// setup auto-lock
		rootInputElement.addEventListener('keydown', (e) => {
			this.services.keyAgent.resetAutoLock();
		});
		rootInputElement.addEventListener('click', (e) => {
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

	// setup the site icon database and connection to
	// the Passcards service for fetching site icons
	private setupItemIconProvider() {
		var siteInfoProvider = new siteinfo_client.PasscardsClient();
		var iconDiskCache = new key_value_store.IndexedDBDatabase();
		iconDiskCache.open('passcards', 1 /* version */, (schemaModifier) => {
			schemaModifier.createStore('icon-cache');
		});

		var ICON_SIZE = 48;

		return new item_icons.ItemIconProvider(iconDiskCache.store('icon-cache'),
		  siteInfoProvider, ICON_SIZE);
	}

	// setup the connection to the cloud file system
	private setupVfs() {
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
		return fs;
	}

	// setup access to the system clipboard and
	// browser tabs via browser extension APIs
	private setupBrowserExtension() {
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
		return <BrowserExtension>{
			pageAccess: pageAccess,
			clipboard: clipboard
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
