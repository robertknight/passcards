/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../typings/fastclick.d.ts" />
/// <reference path="../typings/react-0.12.d.ts" />
/// <reference path="../node_modules/ts-style/dist/ts-style.d.ts" />

import assert = require('assert');
import fastclick = require('fastclick');
import react = require('react');
import underscore = require('underscore');

import app_view = require('./app_view');
import autofill = require('./autofill');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import event_stream = require('../lib/base/event_stream');
import item_icons = require('./item_icons');
import key_agent = require('../lib/key_agent');
import key_value_store = require('../lib/base/key_value_store');
import local_store = require('../lib/local_store');
import onepass = require('../lib/agile_keychain');
import onepass_crypto = require('../lib/onepass_crypto');
import page_access = require('./page_access');
import settings = require('./settings');
import siteinfo_client = require('../lib/siteinfo/client');
import sync = require('../lib/sync');
import vfs = require('../lib/vfs/vfs');

declare var firefoxAddOn: page_access.ExtensionConnector;

interface BrowserExtension {
	pageAccess: page_access.PageAccess;
	clipboard: page_access.ClipboardAccess;
}

export class App {
	// a reference to the rendered AppView instance
	private activeAppView: any;

	private savedState: app_view.AppViewState;
	private services: app_view.AppServices;
	private fs: vfs.VFS;

	constructor() {
		this.savedState = {};
		var settingStore = new settings.LocalStorageStore();

		this.fs = this.setupVfs();
		var browserExt = this.setupBrowserExtension();

		var keyAgent = new key_agent.SimpleKeyAgent();
		keyAgent.setAutoLockTimeout(settingStore.get<number>(settings.Setting.AutoLockTimeout));

		var iconProvider = this.setupItemIconProvider();
		
		this.services = {
			iconProvider: iconProvider,
			autofiller: new autofill.AutoFiller(browserExt.pageAccess),
			pageAccess: browserExt.pageAccess,
			keyAgent: keyAgent,
			clipboard: browserExt.clipboard,
			settings: settingStore,
			fs: this.fs
		};

		this.services.keyAgent.onLock().listen(() => {
			this.updateState({isLocked: true});
		});

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

		browserExt.pageAccess.pageChanged.listen((url) => {
			this.updateState({currentUrl: url});
		});

		// handle login/logout events
		settingStore.onChanged.listen((setting) => {
			if (setting == settings.Setting.ActiveAccount) {
				var accountId = settingStore.get<string>(settings.Setting.ActiveAccount);
				var accounts = settingStore.get<settings.AccountMap>(settings.Setting.Accounts);
				var account = accounts[accountId];

				if (account) {
					this.initAccount(account);
				} else {
					keyAgent.forgetKeys();
					this.updateState({store: null, syncer: null});
				}
			}
		});

		// connect to current account if set
		var accountId = settingStore.get<string>(settings.Setting.ActiveAccount);
		if (accountId) {
			var accounts = settingStore.get<settings.AccountMap>(settings.Setting.Accounts);
			if (accounts && accounts[accountId]) {
				this.initAccount(accounts[accountId]);
			}
		}
	}

	private databaseKeyForAccount(account: settings.Account) {
		return `passcards-${account.id}`;
	}

	// setup the local store, remote store and item syncing
	// once the user completes login
	private initAccount(account: settings.Account) {
		this.fs.login().then(() => {
			try {
				var itemDatabase = new key_value_store.IndexedDBDatabase();
				var vault = new onepass.Vault(this.fs, account.storePath, this.services.keyAgent);
				var localDatabaseName = this.databaseKeyForAccount(account);
				var store = new local_store.Store(itemDatabase, localDatabaseName, this.services.keyAgent);
				var syncer = new sync.CloudStoreSyncer(store, vault);
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
			} catch (err) {
				console.log('vault setup failed', err, err.stack);
			}
		}).catch((err) => {
			this.activeAppView.showError(err);
			console.log('Failed to setup vault', err.toString());
		});
	}

	private getViewportRect(view: Window) {
		return {
			left: 0,
			right: view.innerWidth,
			top: 0,
			bottom: view.innerHeight
		};
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
		var appWindow = rootInputElement.ownerDocument.defaultView;
		var stateChanged = new event_stream.EventStream<app_view.AppViewState>();
		var appView = app_view.AppViewF({
			services: this.services,
			stateChanged: stateChanged,
			viewportRect: this.getViewportRect(appWindow)
		});
		stateChanged.listen((state: app_view.AppViewState) => {
			// save app state for when the app's view is mounted
			// via renderInto()
			this.savedState = underscore.clone(state);
		}, this);
		this.activeAppView = react.render(appView, element);
		this.updateState(this.savedState);

		// in the Chrome extension, the app runs in a background
		// page but the UI is rendered into a popup window
		// which is unloaded when dismissed by the user.
		//
		// In the Firefox add-on, the popup's HTML page
		// persists when the popup is dismissed.
		appWindow.addEventListener('unload', () => {
			react.unmountComponentAtNode(element);
		});

		if (!env.isTouchDevice()) {
			// the main item list only renders visible items,
			// so force a re-render when the window size changes.
			//
			// We don't do this for touch devices since the viewport
			// resizes (at least on Android) when the on-screen keyboard
			// is shown and we want to ignore that.
			//
			// TODO - Find a better solution for Android which
			// avoids re-rendering/zooming/scaling the UI when the keyboard
			// is shown but ensures that the app knows about the viewport
			// and can use it to avoid showing elements (eg. popup menus)
			// underneath the keyboard
			element.ownerDocument.defaultView.onresize = () => {
				this.activeAppView.setState({viewportRect: this.getViewportRect(rootInputElement.ownerDocument.defaultView)});
			};
		}
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

		return new item_icons.BasicIconProvider(iconDiskCache.store('icon-cache'),
		  siteInfoProvider, ICON_SIZE);
	}

	// setup the connection to the cloud file system
	private setupVfs() {
		var fs: vfs.VFS;
		if (env.isFirefoxAddon()) {
			fs = new dropboxvfs.DropboxVFS({
				authMode: dropboxvfs.AuthMode.Redirect,
				authRedirectUrl: firefoxAddOn.oauthRedirectUrl,
				disableLocationCleanup: true,
				receiverPage: ''
			});
		} else if (env.isChromeExtension()) {
			fs = new dropboxvfs.DropboxVFS({
				authMode: dropboxvfs.AuthMode.ChromeExtension,
				authRedirectUrl: '',
				disableLocationCleanup: true,
				receiverPage: 'data/chrome_dropbox_oauth_receiver.html'
			});
		} else {
			fs = new dropboxvfs.DropboxVFS();
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

	private updateState(state: app_view.AppViewState) {
		if (this.activeAppView) {
			this.activeAppView.setState(state);
		} else {
			// save app state for when the app's view is mounted
			// via renderInto()
			underscore.extend(this.savedState, state);
		}
	}
}
