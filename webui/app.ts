/// <reference path="../typings/fastclick.d.ts" />
/// <reference path="../typings/react.d.ts" />
/// <reference path="../node_modules/ts-style/dist/ts-style.d.ts" />

import fastclick = require('fastclick');
import react = require('react');

import agile_keychain = require('../lib/agile_keychain');
import agile_keychain_crypto = require('../lib/agile_keychain_crypto');
import app_view = require('./app_view');
import autofill = require('./autofill');
import browser_access = require('./browser_access');
import dropboxvfs = require('../lib/vfs/dropbox');
import env = require('../lib/base/env');
import http_vfs = require('../lib/vfs/http');
import item_icons = require('./item_icons');
import key_agent = require('../lib/key_agent');
import key_value_store = require('../lib/base/key_value_store');
import local_store = require('../lib/local_store');
import settings = require('./settings');
import siteinfo_client = require('../lib/siteinfo/client');
import sync = require('../lib/sync');
import app_state = require('./stores/app');
import vfs = require('../lib/vfs/vfs');

declare var firefoxAddOn: browser_access.ExtensionConnector;

interface BrowserExtension {
	pageAccess: browser_access.BrowserAccess;
	clipboard: browser_access.ClipboardAccess;
}

export class App {
	// a reference to the rendered AppView instance
	private activeAppView: any;

	private state: app_state.Store;
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
			this.state.update({ isLocked: true });
		});

		this.state = new app_state.Store();

		agile_keychain_crypto.CryptoJsCrypto.initWorkers();

		browserExt.pageAccess.events.listen(event => {
			switch (event.type) {
				case browser_access.MessageType.ExtensionUIShown:
					// in the Firefox add-on the active element loses focus when dismissing the
					// panel by focusing another UI element such as the URL input bar.
					//
					// Restore focus to the active element when the panel is shown again
					if (document.activeElement) {
						(<HTMLElement>document.activeElement).focus();
					}
					break;
				case browser_access.MessageType.ActiveTabURLChanged:
					this.state.update({ currentUrl: (<browser_access.TabURLChangeMessage>event).url });
					break;
			}
		});

		// update the initial URL when the app is loaded
		this.state.update({ currentUrl: browserExt.pageAccess.currentUrl });

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
					this.state.update({ store: null, syncer: null });
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
		if (account.accessToken) {
			fs.setCredentials({
				accessToken: account.accessToken
			});
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

			this.state.update({ store: store, syncer: syncer });
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
			appState: this.state
		});
		this.activeAppView = react.render(appView, element);

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
		var pageAccess: browser_access.BrowserAccess;
		var clipboard: browser_access.ClipboardAccess;

		if (typeof firefoxAddOn != 'undefined') {
			var extensionPageAccess = new browser_access.ExtensionBrowserAccess(firefoxAddOn);
			pageAccess = extensionPageAccess;
			clipboard = extensionPageAccess;
		} else if (env.isChromeExtension()) {
			var chromePageAccess = new browser_access.ChromeBrowserAccess();
			pageAccess = chromePageAccess;
			clipboard = chromePageAccess;
		} else {
			pageAccess = new browser_access.ExtensionBrowserAccess(new browser_access.FakeExtensionConnector());
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
