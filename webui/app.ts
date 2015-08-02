/// <reference path="../typings/fastclick.d.ts" />
/// <reference path="../typings/react.d.ts" />
/// <reference path="../node_modules/ts-style/dist/ts-style.d.ts" />

import fastclick = require('fastclick');
import react = require('react');

import agile_keychain = require('../lib/agile_keychain');
import agile_keychain_crypto = require('../lib/agile_keychain_crypto');
import app_view = require('./app_view');
import autofill = require('./autofill');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import http_vfs = require('../lib/vfs/http');
import item_icons = require('./item_icons');
import key_agent = require('../lib/key_agent');
import key_value_store = require('../lib/base/key_value_store');
import local_store = require('../lib/local_store');
import page_access = require('./page_access');
import settings = require('./settings');
import siteinfo_client = require('../lib/siteinfo/client');
import sync = require('../lib/sync');
import ui_item_store = require('./stores/items');
import vfs = require('../lib/vfs/vfs');

declare var firefoxAddOn: page_access.ExtensionConnector;

interface BrowserExtension {
	pageAccess: page_access.PageAccess;
	clipboard: page_access.ClipboardAccess;
}

export class App {
	// a reference to the rendered AppView instance
	private activeAppView: any;

	private itemStore: ui_item_store.Store;
	private services: app_view.AppServices;

	constructor() {
		var settingStore = new settings.LocalStorageStore();

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
			settings: settingStore
		};

		this.services.keyAgent.onLock().listen(() => {
			this.itemStore.update({ isLocked: true });
		});

		this.itemStore = new ui_item_store.Store();

		agile_keychain_crypto.CryptoJsCrypto.initWorkers();

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
		this.itemStore.update({ currentUrl: browserExt.pageAccess.currentUrl });

		browserExt.pageAccess.pageChanged.listen((url) => {
			this.itemStore.update({ currentUrl: url });
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
					this.itemStore.update({ store: null, syncer: null });
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

	private createCloudFileSystem(account: settings.Account) {
		let fs: vfs.VFS;
		if (account.cloudService === settings.CloudService.Dropbox) {
			fs = new dropboxvfs.DropboxVFS();
		} else if (account.cloudService === settings.CloudService.LocalTestingServer) {
			fs = new http_vfs.Client(http_vfs.DEFAULT_URL);
		}
		if (account.credentials) {
			fs.setCredentials(account.credentials);
		}
		return fs;
	}

	// setup the local store, remote store and item syncing
	// once the user completes login
	private initAccount(account: settings.Account) {
		let fs = this.createCloudFileSystem(account);
		try {
			let itemDatabase = new key_value_store.IndexedDBDatabase();
			let vault = new agile_keychain.Vault(fs, account.storePath, this.services.keyAgent);
			let localDatabaseName = this.databaseKeyForAccount(account);
			let store = new local_store.Store(itemDatabase, localDatabaseName, this.services.keyAgent);
			let syncer = new sync.CloudStoreSyncer(store, vault);
			syncer.syncKeys().then(() => {
				console.log('Encryption keys synced')
			}).catch((err) => {
				this.activeAppView.showError(err);
			});

			this.itemStore.update({ store: store, syncer: syncer });
		} catch (err) {
			this.activeAppView.showError(err, 'Store setup failed');
		}
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
		var appView = app_view.AppViewF({
			services: this.services,
			viewportRect: this.getViewportRect(appWindow),
			itemStore: this.itemStore
		});
		this.activeAppView = react.render(appView, element);

		// in the Chrome extension, the app runs in a background
		// page but the UI is rendered into a popup window
		// which is unloaded when dismissed by the user.
		//
		// In the Firefox add-on, the popup's HTML page
		// persists when the popup is dismissed.
		appWindow.addEventListener('unload', () => {
			react.unmountComponentAtNode(element);
			this.activeAppView = null;
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
				this.activeAppView.setState({ viewportRect: this.getViewportRect(rootInputElement.ownerDocument.defaultView) });
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
				clipboardAvailable: () => {
					return false;
				}
			};
		}
		return <BrowserExtension>{
			pageAccess: pageAccess,
			clipboard: clipboard
		};
	}
}
