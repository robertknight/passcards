import assert = require('assert');
import react = require('react');
import style = require('ts-style');
import url = require('url');

import app_theme = require('./theme');
import auth_dialog = require('./auth_dialog');
import autofill = require('./autofill');
import colors = require('./controls/colors');
import details_view = require('./details_view');
import item_builder = require('../lib/item_builder');
import item_list = require('./item_list_view');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
import key_agent = require('../lib/key_agent');
import menu = require('./controls/menu');
import browser_access = require('./browser_access');
import password_gen = require('../lib/password_gen');
import reactutil = require('./base/reactutil');
import settings = require('./settings');
import setup_view = require('./setup_view');
import status_message = require('./status');
import sync = require('../lib/sync');
import toaster = require('./controls/toaster');
import unlock_view = require('./unlock_view');
import url_util = require('../lib/base/url_util');
import app_state = require('./stores/app');
import { delay } from '../lib/base/promise_util';

var theme = style.create({
	appView: {
		width: '100%',
		height: '100%',
		userSelect: 'none',
		color: colors.MATERIAL_TEXT_PRIMARY
	}
}, __filename);

export interface AppViewState {
	selectedItemRect?: reactutil.Rect;

	status?: status_message.Status;

	appMenuSourceRect?: reactutil.Rect;
	viewportRect?: reactutil.Rect;
}

export interface AppServices {
	pageAccess: browser_access.BrowserAccess;
	autofiller: autofill.AutoFillHandler;
	iconProvider: item_icons.IconProvider;
	keyAgent: key_agent.KeyAgent;
	clipboard: browser_access.ClipboardAccess;
	settings?: settings.Store;
}

export interface AppViewProps extends react.Props<void> {
	services: AppServices;
	viewportRect: reactutil.Rect;
	appState: app_state.Store;
}

/** The main top-level app view. */
class AppView extends react.Component<AppViewProps, AppViewState> {
	private mounted: boolean;

	constructor(props: AppViewProps) {
		super(props);

		this.state = {viewportRect: this.props.viewportRect};
	}

	componentWillMount() {
		this.mounted = true;
		this.props.appState.stateChanged.listen(state => {
			this.forceUpdate();
		}, this);
	}

	componentWillUnmount() {
		this.props.appState.stateChanged.ignoreContext(this);
	}

	private showError(error: Error, context?: string) {
		assert(error.message);

		let message = context || '';
		if (message) {
			message += ': ';
		}
		message += error.message;

		var status = new status_message.Status(status_message.StatusType.Error, message);
		this.showStatus(status);
		console.log('App error:', error.message, error.stack);
	}

	private showStatus(status: status_message.Status) {
		status.expired.listen(() => {
			if (this.state.status == status) {
				this.setState({ status: null });
			}
		});

		this.setState({ status: status });
	}

	private autofill(item: item_store.Item) {
		this.props.services.autofiller.autofill(item).then((result) => {
			if (result.count > 0) {
				this.props.services.pageAccess.hidePanel();
			}
		}).catch((err) => {
			this.showError(err.message);
		});
	}

	private setSelectedItem(item: item_store.Item, rect?: reactutil.Rect) {
		var state = <app_state.State>{
			selectedItem: item,
		};
		if (item) {
			if (item.isSaved()) {
				state.itemEditMode = details_view.ItemEditMode.EditItem;
			} else {
				state.itemEditMode = details_view.ItemEditMode.AddItem;
			}
		}
		this.props.appState.update(state);
		this.setState({ selectedItemRect: rect });
	}

	render(): react.ReactElement<any> {
		if (!this.props.appState.state.store) {
			return setup_view.SetupViewF({
				settings: this.props.services.settings
			});
		}

		var children: react.ReactElement<any>[] = [];
		var itemStoreState = this.props.appState.state;

		children.push(unlock_view.UnlockViewF({
			key: 'unlockPane',
			store: itemStoreState.store,
			isLocked: itemStoreState.isLocked,
			focus: itemStoreState.isLocked,
			onUnlock: () => {
				this.props.appState.update({ isLocked: false });
				itemStoreState.syncer.syncItems().then(result => {
					if (result.failed > 0) {
						this.showError(new Error(`Sync completed but ${result.failed} items failed to sync`));
					}
				}).catch(err => {
					this.showError(new Error(`Unable to sync items: ${err.toString() }`));
				});
			},
			onUnlockErr: (err) => {
				this.showError(err);
			},
			onMenuClicked: (rect) => {
				this.setState({ appMenuSourceRect: rect });
			}
		}));

		children.push(this.renderItemList());
		children.push(this.renderItemDetails());
		children.push(this.renderToasters());
		children.push(this.renderDialogs());

		var menu = reactutil.TransitionGroupF(<any>{ key: 'toolbar-menu' },
			this.state.appMenuSourceRect ? this.renderMenu('menu') : null
			);
		children.push(menu);

		return react.DOM.div(style.mixin(theme.appView, { ref: 'app' }),
			children
			);
	}

	private renderDialogs() {
		let activeDialog: react.ReactElement<{}>;
		if (this.props.appState.state.isSigningIn) {
			activeDialog = auth_dialog.AuthDialogF({
				authServerURL: this.props.appState.state.authServerURL,
				onComplete: credentials => {
					if (credentials) {
						this.props.appState.state.onReceiveCredentials(credentials);
					}
					this.props.appState.update({ isSigningIn: false })
				}
			});
		}
		return activeDialog;
	}

	private renderToasters() {
		var toasters: react.ReactElement<toaster.ToasterProps>[] = [];
		if (this.state.status) {
			toasters.push(toaster.ToasterF({
				key: 'status-toaster',
				message: this.state.status.text
			}));
		}

		var syncState = this.props.appState.state.syncState
		if (syncState &&
			syncState.state !== sync.SyncState.Idle) {
			toasters.push(toaster.ToasterF({
				key: 'sync-toaster',
				message: 'Syncing...',
				progressValue: syncState.updated,
				progressMax: syncState.total
			}));
		}
		return reactutil.TransitionGroupF(<any>{ key: 'toasterList' },
			toasters
			);
	}

	private renderItemList() {
		var itemStoreState = this.props.appState.state;
		return item_list.ItemListViewF({
			key: 'itemList',
			ref: 'itemList',
			items: itemStoreState.items,
			selectedItem: itemStoreState.selectedItem,
			onSelectedItemChanged: (item, rect) => {
				this.setSelectedItem(item, rect);
			},
			currentUrl: itemStoreState.currentUrl,
			iconProvider: this.props.services.iconProvider,
			onLockClicked: () => this.props.services.keyAgent.forgetKeys(),
			onMenuClicked: (e) => {
				this.setState({ appMenuSourceRect: e.itemRect });
			},
			focus: !itemStoreState.isLocked && !itemStoreState.selectedItem
		});
	}

	private itemStoreState() {
		return this.props.appState.state;
	}

	private renderItemDetails() {
		var detailsView: react.ReactElement<{}>;
		if (this.itemStoreState().selectedItem) {
			var appRect = this.state.viewportRect;

			var selectedItemRect = this.state.selectedItemRect;
			if (!selectedItemRect) {
				// when adding a new item, the details view
				// will slide up from the bottom of the screen
				selectedItemRect = {
					top: appRect.bottom,
					bottom: appRect.bottom,
					left: appRect.left,
					right: appRect.right
				};
			}

			detailsView = details_view.DetailsViewF({
				key: 'detailsView',
				item: this.itemStoreState().selectedItem,
				editMode: this.itemStoreState().itemEditMode,
				iconProvider: this.props.services.iconProvider,
				currentUrl: this.itemStoreState().currentUrl,
				onGoBack: () => {
					this.setSelectedItem(null);
				},
				onSave: (updatedItem) => {
					// defer saving the item until the details view has
					// transitioned out
					var SAVE_DELAY = 1000;
					delay(null, SAVE_DELAY).then(() => {
						return updatedItem.item.saveTo(this.itemStoreState().store);
					}).then(() => {
						return this.itemStoreState().syncer.syncItems();
					}).then(() => {
						this.showStatus(new status_message.Status(status_message.StatusType.Success,
							'Changes saved and synced'))
					}).catch((err) => {
						this.showError(err);
					});
				},
				autofill: () => {
					this.autofill(this.itemStoreState().selectedItem);
				},
				clipboard: this.props.services.clipboard,
				focus: this.itemStoreState().selectedItem != null,

				// make the details view expand from the entry
				// in the item list, but only if we switch to it
				// after the app is initially shown
				animateEntry: this.mounted,

				entryRect: {
					left: appRect.left,
					right: appRect.right,
					top: selectedItemRect.top,
					bottom: selectedItemRect.bottom
				},

				viewportRect: this.state.viewportRect
			});
		}
		return detailsView;
	}

	private createNewItemTemplate() {
		// use the most common account (very likely the user's email address)
		// as the default account login for new items
		var accountFreq: { [id: string]: number } = {};
		this.itemStoreState().items.forEach((item) => {
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

		var randomPassword = password_gen.generatePassword(12);
		var builder = new item_builder.Builder(item_store.ItemTypes.LOGIN)
		.addLogin(defaultAccount)
		.addPassword(randomPassword);

		// prefill the new item with the current URL for web pages.
		// Avoid prefilling for special browser pages (eg. 'about:version',
		// 'chrome://settings') or blank tabs
		var AUTOFILL_URL_SCHEMES = ['http:', 'https:', 'ftp:'];
		var currentUrlProtocol = url.parse(this.itemStoreState().currentUrl).protocol;

		if (AUTOFILL_URL_SCHEMES.indexOf(currentUrlProtocol) !== -1) {
			builder.setTitle(url_util.topLevelDomain(this.itemStoreState().currentUrl));
			builder.addUrl(this.itemStoreState().currentUrl);
		} else {
			builder.setTitle('New Login');
		}

		return builder.item();
	}

	private renderMenu(key: string) {
		var menuItems: menu.MenuItem[] = [];
		if (!this.itemStoreState().isLocked) {
			menuItems = menuItems.concat([{
				label: 'Add Item',
				onClick: () => {
					this.setSelectedItem(this.createNewItemTemplate());
				}
			}]);
		}

		menuItems = menuItems.concat([{
			label: 'Clear Offline Storage',
			onClick: () => {
				return this.props.services.keyAgent.forgetKeys().then(() => {
					return this.itemStoreState().store.clear();
				}).then(() => {
					return this.itemStoreState().syncer.syncKeys();
				}).catch((err) => {
					this.showError(err);
				});
			}
		}, {
				label: 'Switch Store',
				onClick: () => {
					this.props.services.settings.clear(settings.Setting.ActiveAccount)
				}
			}, {
				label: 'Help',
				onClick: () => {
					var win = window.open('https://robertknight.github.io/passcards', '_blank');
					win.focus();
				}
			}]);
		return menu.MenuF({
			key: key,
			items: menuItems,
			sourceRect: this.state.appMenuSourceRect,
			viewportRect: this.state.viewportRect,
			onDismiss: () => {
				this.setState({ appMenuSourceRect: null });
			},
			zIndex: app_theme.Z_LAYERS.MENU_LAYER
		});
	}
}

export var AppViewF = react.createFactory(AppView);
