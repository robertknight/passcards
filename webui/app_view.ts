import assert = require('assert');
import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');
import url = require('url');
import underscore = require('underscore');

import autofill = require('./autofill');
import details_view = require('./details_view');
import event_stream = require('../lib/base/event_stream');
import item_builder = require('../lib/item_builder');
import item_list = require('./item_list');
import item_icons = require('./item_icons');
import item_store = require('../lib/item_store');
import key_agent = require('../lib/key_agent');
import menu = require('./controls/menu');
import onepass_crypto = require('../lib/onepass_crypto');
import page_access = require('./page_access');
import reactutil = require('./base/reactutil');
import settings = require('./settings');
import setup_view = require('./setup_view');
import sync = require('../lib/sync');
import theme = require('./theme');
import toaster = require('./controls/toaster');
import unlock_view = require('./unlock_view');
import url_util = require('../lib/base/url_util');
import vfs = require('../lib/vfs/vfs');

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

export interface AppViewState {
	store?: item_store.Store;
	syncer?: sync.Syncer;
	items?: item_store.Item[];

	selectedItem?: item_store.Item;
	selectedItemRect?: reactutil.Rect;

	itemEditMode?: details_view.ItemEditMode;
	isLocked?: boolean;
	currentUrl?: string;

	status?: Status;
	syncState?: sync.SyncProgress;
	syncListener?: event_stream.EventListener<sync.SyncProgress>;

	appMenuSourceRect?: reactutil.Rect;

	viewportRect?: reactutil.Rect;
}

export interface AppServices {
	pageAccess: page_access.PageAccess;
	autofiller: autofill.AutoFillHandler;
	iconProvider: item_icons.IconProvider;
	keyAgent: key_agent.KeyAgent;
	clipboard: page_access.ClipboardAccess;
	settings?: settings.Store;
	fs: vfs.VFS;
}

export interface AppViewProps {
	services: AppServices;
	stateChanged: event_stream.EventStream<AppViewState>;
	viewportRect: reactutil.Rect;
}

/** The main top-level app view. */
class AppView extends typed_react.Component<AppViewProps, AppViewState> {
	getInitialState() {
		var syncListener = (progress: sync.SyncProgress) => {
			this.setState({ syncState: progress });
		};

		var state = {
			items: <item_store.Item[]>[],
			isLocked: true,
			syncListener: syncListener,
			itemEditMode: details_view.ItemEditMode.EditItem,
			viewportRect: this.props.viewportRect
		};
		return state;
	}

	componentDidMount() {
		this.componentWillUpdate(this.props, this.state);
	}

	componentWillUnmount() {
		if (this.state.syncer) {
			this.state.syncer.onProgress.ignoreContext(this);
		}
		if (this.state.store) {
			this.state.store.onItemUpdated.ignoreContext(this);
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
				this.state.syncer.onProgress.ignoreContext(this);
			}
			if (nextState.syncer) {
				nextState.syncer.onProgress.listen(this.state.syncListener, this);
			}
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
			if (nextState.store) {
				nextState.store.onItemUpdated.listen(debouncedRefresh, this);
			}
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

	private showError(error: Error) {
		assert(error.message);

		var status = new Status(StatusType.Error, error.message);
		this.showStatus(status);
		console.log('App error:', error.message, error.stack);
	}

	private showStatus(status: Status) {
		status.expired.listen(() => {
			if (this.state.status == status) {
				this.setState({status: null});
			}
		});

		this.setState({status: status});
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
		var state = <AppViewState>{
			selectedItem: item,
			selectedItemRect: rect
		};
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
			return setup_view.SetupViewF({
				settings: this.props.services.settings,
				fs: this.props.services.fs
			});
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
			},
			onMenuClicked: (rect) => {
				this.setState({appMenuSourceRect: rect});
			}
		}));

		children.push(this.renderItemList());
		children.push(this.renderItemDetails());
		children.push(this.renderToasters());

		var menu = reactutil.TransitionGroupF({},
		  this.state.appMenuSourceRect ? this.renderMenu('menu') : null
		);
		children.push(menu);

		return react.DOM.div(style.mixin(theme.appView, {ref: 'app'}),
			children
		);
	}

	private renderToasters() {
		var toasters: React.ComponentElement<toaster.ToasterProps>[] = [];
		if (this.state.status) {
			toasters.push(toaster.ToasterF({
				key: 'status-toaster',
				message: this.state.status.text
			}));
		}
		if (this.state.syncState &&
		    this.state.syncState.state !== sync.SyncState.Idle) {
			toasters.push(toaster.ToasterF({
				key: 'sync-toaster',
				message: 'Syncing...',
				progressValue: this.state.syncState.updated,
				progressMax: this.state.syncState.total
			}));
		}
		return reactutil.TransitionGroupF({key: 'toasterList'},
		  toasters
		);
	}

	private renderItemList() {
		return item_list.ItemListViewF({
			key: 'itemList',
			ref: 'itemList',
			items: this.state.items,
			selectedItem: this.state.selectedItem,
			onSelectedItemChanged: (item, rect) => { 
				this.setSelectedItem(item, rect); 
			},
			currentUrl: this.state.currentUrl,
			iconProvider: this.props.services.iconProvider,
			onLockClicked: () => this.props.services.keyAgent.forgetKeys(),
			onMenuClicked: (e) => {
				this.setState({appMenuSourceRect: e.itemRect});
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
			var appRect = (<HTMLElement>this.getDOMNode()).getBoundingClientRect();

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
				item: this.state.selectedItem,
				editMode: this.state.itemEditMode,
				iconProvider: this.props.services.iconProvider,
				currentUrl: this.state.currentUrl,
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
				focus: this.state.selectedItem != null,

				// make the details view expand from the entry
				// in the item list
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

		// prefill the new item with the current URL for web pages.
		// Avoid prefilling for special browser pages (eg. 'about:version',
		// 'chrome://settings') or blank tabs
		var AUTOFILL_URL_SCHEMES = ['http:', 'https:', 'ftp:'];
		var currentUrlProtocol = url.parse(this.state.currentUrl).protocol;

		if (AUTOFILL_URL_SCHEMES.indexOf(currentUrlProtocol) !== -1) {
			builder.setTitle(url_util.topLevelDomain(this.state.currentUrl));
			builder.addUrl(this.state.currentUrl);
		} else {
			builder.setTitle('New Login');
		}

		return builder.item();
	}

	private renderMenu(key: string) {
		var menuItems: menu.MenuItem[] = [];
		if (!this.state.isLocked) {
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
					return this.state.store.clear();
				}).then(() => {
					return this.state.syncer.syncKeys();
				}).catch((err) => {
					this.showError(err);
				});
			}
		},{
			label: 'Switch Account',
			onClick: () => {
				this.props.services.settings.clear(settings.Setting.ActiveAccount)
			}
		},{
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
			   this.setState({appMenuSourceRect: null});
			},
			zIndex: theme.zLayers.MENU_LAYER
		});
	}
}

export var AppViewF = reactutil.createFactory(AppView);

