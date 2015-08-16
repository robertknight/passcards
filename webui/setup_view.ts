/// <reference path="../typings/react.d.ts" />

import Q = require('q');
import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import agile_keychain = require('../lib/agile_keychain');
import assign = require('../lib/base/assign');
import button = require('./controls/button');
import colors = require('./controls/colors');
import fonts = require('./controls/fonts');
import reactutil = require('./base/reactutil');
import ripple = require('./controls/ripple');
import settings = require('./settings');
import status_message = require('./status');
import stringutil = require('../lib/base/stringutil');
import style_util = require('./base/style_util');
import text_field = require('./controls/text_field');
import toaster = require('./controls/toaster');
import vfs = require('../lib/vfs/vfs');

var mixins = style.create({
	setupScreen: {
		marginTop: 10,
		marginBottom: 10,
		backgroundColor: 'white',
		borderRadius: 3,
		color: colors.MATERIAL_TEXT_PRIMARY,
		minHeight: 40,

		padding: {
			padding: 15,
			paddingTop: 10,
			paddingBottom: 10
		}
	},

	hCenter: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center'
	}
});

var theme = style.create({
	setupView: {
		width: '100%',
		height: '100%',
		backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
		color: 'white',
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',

		inner: {
			position: 'relative',
			width: 'calc(100% + 2px)',
			height: 'calc(100% + 2px)',
			maxWidth: 400,
			maxHeight: 600,
			border: '1px solid white',
			overflow: 'hidden'
		}
	},

	storeList: {
		mixins: [mixins.setupScreen],

		item: {
			padding: 15,
			paddingTop: 10,
			paddingBottom: 10,
			boxSizing: 'border-box',
			minHeight: 40,

			cursor: 'pointer',
			position: 'relative',
			overflow: 'hidden',
			userSelect: 'none',

			path: {
				fontSize: fonts.itemPrimary.size,
				color: colors.MATERIAL_TEXT_PRIMARY
			},

			store: {
				fontSize: fonts.itemSecondary.size,
				color: colors.MATERIAL_TEXT_SECONDARY
			},

			addStore: {
				fontSize: fonts.itemPrimary.size,
				textTransform: 'uppercase',
				color: colors.MATERIAL_COLOR_PRIMARY
			}
		}
	},

	cloudStoreList: {
		mixins: [mixins.setupScreen],

		item: {
			padding: 15,
			paddingTop: 10,
			paddingBottom: 10,
			cursor: 'pointer',
			position: 'relative',
			overflow: 'hidden',
			userSelect: 'none'
		}
	},

	newStore: {
		mixins: [mixins.setupScreen, mixins.setupScreen.padding],

	},

	creatingStore: {
		mixins: [mixins.setupScreen],
		label: {
			color: colors.MATERIAL_TEXT_PRIMARY,
			fontSize: fonts.subhead.size
		}
	},

	screen: {
		transition: style_util.transitionOn({
			transform: .3,
			opacity: .3
		}),
		position: 'absolute',
		left: 10,
		top: 10,
		width: 'calc(100% - 20px)',
		height: 'calc(100% - 20px)',
		color: 'white',
		transform: 'translateX(0px)'
	},

	screenButtons: {
		display: 'flex',
		flexDirection: 'row',

		spacer: {
			flexGrow: 1
		}
	},

	header: {
		fontSize: fonts.title.size,
		fontWeight: fonts.title.weight,
		marginTop: 10,
		marginBottom: 15,
		textAlign: 'center'
	}
});

interface NavButtonProps extends react.Props<void> {
	label: string;
	onClick: () => void;
	iconUrl?: string;
	disabled?: boolean;
}

/** Button displayed at the bottom of the setup view
  * to go to the previous/next steps.
  */
class NavButton extends typed_react.Component<NavButtonProps, {}> {
	render() {
		return button.ButtonF({
			style: button.Style.RaisedRectangular,
			backgroundColor: 'white',
			value: this.props.label,
			iconUrl: this.props.iconUrl,
			onClick: this.props.onClick,
			disabled: this.props.disabled
		});
	}
}
var NavButtonF = reactutil.createFactory(NavButton);

interface CloudStoreListProps extends react.Props<void> {
	vfs: vfs.VFS;
	onSelectStore: (path: string) => void;
}

interface Store {
	path: string;
}

interface CloudStoreListState {
	stores?: Store[];
	error?: Error;
}

/** Displays a list of available password stores in a cloud file system */
class CloudStoreList extends typed_react.Component<CloudStoreListProps, CloudStoreListState> {
	getInitialState() {
		return {};
	}

	private startSearch() {
		this.props.vfs.search('.agilekeychain', (error, files) => {
			if (error) {
				this.setState({ error: error });
				return;
			}

			var stores = this.state.stores || <Store[]>[];
			stores = stores.concat(files.map((file) => {
				return { path: file.path };
			}));
			stores.sort((a, b) => {
				return a.path.localeCompare(b.path);
			});
			this.setState({
				stores: stores
			});
		});
	}

	componentDidMount() {
		this.startSearch();
	}

	render() {
		if (!this.state.stores) {
			if (this.state.error) {
				return react.DOM.div(style.mixin(theme.cloudStoreList),
					`Unable to search Dropbox for existing stores: ${this.state.error.message}`,
					react.DOM.div(style.mixin(theme.screenButtons),
						button.ButtonF({
							style: button.Style.Rectangular,
							color: colors.MATERIAL_COLOR_PRIMARY,
							value: 'Try Again',
							onClick: () => {
								this.setState({ error: null });
								this.startSearch();
							}
						})
						)
					);
			} else {
				return react.DOM.div(style.mixin(theme.cloudStoreList),
					react.DOM.div(style.mixin(theme.cloudStoreList.item), 'Searching for existing stores...')
					);
			}
		} else {
			return react.DOM.div(style.mixin(theme.cloudStoreList), this.state.stores.map((store) => {
				var displayPath = store.path;
				if (stringutil.startsWith(displayPath, '/')) {
					displayPath = displayPath.slice(1);
				}
				return react.DOM.div(style.mixin(theme.cloudStoreList.item, {
					key: store.path,
					onClick: () => {
						this.props.onSelectStore(store.path);
					}
				}), ripple.InkRippleF({}), displayPath);
			}));
		}
	}
}

var CloudStoreListF = reactutil.createFactory(CloudStoreList);

interface StoreListProps extends react.Props<void> {
	stores: settings.AccountMap;
	onSelectStore: (account: settings.Account) => void;
	onAddStore: () => void;
}

/** Displays a list of password stores which have been synced to the
  * current app.
  */
class StoreList extends typed_react.Component<StoreListProps, {}> {
	render() {
		var stores: react.ReactElement<any>[] = [];
		Object.keys(this.props.stores).forEach((id) => {
			var account = this.props.stores[id];
			var suffixPos = account.storePath.lastIndexOf('.');

			// trim leading '/' and directory/file extension
			var dirStartPos = 0;
			if (stringutil.startsWith(account.storePath, '/')) {
				dirStartPos = 1;
			}
			var displayPath = account.storePath.slice(dirStartPos, suffixPos);
			var cloudService = settings.CloudService[account.cloudService];

			stores.push(react.DOM.div(style.mixin(theme.storeList.item, {
				key: `${cloudService}.${account.id}.${displayPath}`,
				onClick: () => this.props.onSelectStore(account)
			}),
				react.DOM.div(style.mixin(theme.storeList.item.path), displayPath),
				react.DOM.div(style.mixin(theme.storeList.item.store),
					`in ${account.name}'s ${cloudService}`),
				ripple.InkRippleF({})
				));
		});

		stores.push(react.DOM.div(style.mixin(theme.storeList.item, {
			onClick: () => this.props.onAddStore(),
			key: 'add-store'
		}),
			react.DOM.div(style.mixin(theme.storeList.item.addStore), 'Add Store'),
			ripple.InkRippleF({})
			));

		return react.DOM.div(style.mixin(theme.storeList),
			stores
			);
	}
}

var StoreListF = reactutil.createFactory(StoreList);

export interface SetupViewProps extends react.Props<void> {
	settings: settings.Store;
	fs: vfs.VFS;
}

// active screen in the setup / onboarding dialog
enum Screen {
	Welcome,
	StoreList,
	NewStore,
	CloudStoreLogin,
	CloudStoreSignout,
	CloudStoreList,
	CloudServiceList
}

interface NewStoreOptions {
	path?: string;
	password?: string;
	confirmPassword?: string;
	hint?: string;
}

interface SlideProps extends react.Props<void> {
	xTranslation: number;
	opacity: number;
}

class Slide extends typed_react.Component<SlideProps, {}> {
	render() {
		var screenStyles: any[] = [
			theme.screen,
			{
				transform: `translateX(${this.props.xTranslation * 100}%)`,
				opacity: this.props.opacity
			}
		];

		return react.DOM.div(style.mixin(screenStyles),
			this.props.children
			);
	}
}

var SlideF = reactutil.createFactory(Slide);

interface NewStoreFormProps extends react.Props<void> {
	onGoBack: () => void;
	onCreate: (options: NewStoreOptions) => Q.Promise<void>;
}

interface NewStoreFormState {
	options?: NewStoreOptions;
	creatingStore?: boolean;
}

class NewStoreForm extends typed_react.Component<NewStoreFormProps, NewStoreFormState> {
	getInitialState() {
		return {
			options: {
				path: 'Passcards/Passcards.agilekeychain',
				password: '',
				confirmPassword: '',
				hint: ''
			},
			creatingStore: false
		};
	}

	private renderForm() {
		var confirmPasswordError = '';
		if (this.state.options.confirmPassword.length > 0 &&
			this.state.options.password !== this.state.options.confirmPassword) {
			confirmPasswordError = 'Passwords do not match';
		}
		return react.DOM.div(style.mixin(theme.newStore),
			text_field.TextFieldF({
				type: 'text',
				defaultValue: this.state.options.path,
				floatingLabel: true,
				placeHolder: 'Location in Dropbox',
				onChange: (e) => {
					this.setState({
						options: assign(this.state.options, {
							path: (<HTMLInputElement>e.target).value
						})
					});
				}
			}),
			text_field.TextFieldF({
				type: 'password',
				floatingLabel: true,
				placeHolder: 'Master Password',
				onChange: (e) => {
					this.setState({
						options: assign<NewStoreOptions>(this.state.options, {
							password: (<HTMLInputElement>e.target).value
						})
					});
				}
			}),
			text_field.TextFieldF({
				type: 'password',
				floatingLabel: true,
				placeHolder: 'Re-enter Master Password',
				onChange: (e) => {
					this.setState({
						options: assign<NewStoreOptions>(this.state.options, {
							confirmPassword: (<HTMLInputElement>e.target).value
						})
					});
				},
				error: confirmPasswordError
			}),
			text_field.TextFieldF({
				type: 'text',
				floatingLabel: true,
				placeHolder: 'Master password hint',
				onChange: (e) => {
					this.setState({
						options: assign<NewStoreOptions>(this.state.options, {
							hint: (<HTMLInputElement>e.target).value
						})
					});
				}
			})
			);
	}

	render() {
		var passwordsMatch = this.state.options.password == this.state.options.confirmPassword;
		var canCreateStore = !this.state.creatingStore &&
			this.state.options.path.length > 0 &&
			this.state.options.password.length > 0 &&
			passwordsMatch &&
			this.state.options.hint.length > 0;

		var form: react.ReactElement<any>;
		if (this.state.creatingStore) {
			form = react.DOM.div(style.mixin(theme.newStore),
				react.DOM.div(style.mixin(theme.creatingStore.label), 'Creating store...')
				);
		} else {
			form = this.renderForm();
		}

		return react.DOM.div({},
			react.DOM.div(style.mixin(theme.header), 'Setup new store'),
			form,
			react.DOM.div(style.mixin(theme.screenButtons),
				NavButtonF({
					label: 'Back',
					disabled: this.state.creatingStore,
					onClick: () => {
						this.props.onGoBack();
					}
				}),
				NavButtonF({
					label: 'Create Store',
					disabled: !canCreateStore,
					onClick: () => {
						this.setState({ creatingStore: true });
						this.props.onCreate(this.state.options).catch((err) => {
							this.setState({ creatingStore: false });
						});
					}
				})
				)
			);
	}
}

var NewStoreFormF = reactutil.createFactory(NewStoreForm);

interface ScreenOptions {
	temporary?: boolean;
}

interface SetupViewScreen {
	id: Screen;
	options: ScreenOptions;
}

interface SetupViewState {
	accountInfo?: vfs.AccountInfo;
	newStore?: NewStoreOptions;
	status?: status_message.Status;

	screenStack?: SetupViewScreen[];
	currentScreen?: number;
}

function isResumingOAuthLogin() {
	return window.location.hash.indexOf('access_token') !== -1;
}

/** App setup and onboarding screen.
  */
export class SetupView extends typed_react.Component<SetupViewProps, SetupViewState> {
	getInitialState(): SetupViewState {
		var screenStack = [{
			id: Screen.StoreList,
			options: {}
		}];
		if (isResumingOAuthLogin()) {
			screenStack.push({
				id: Screen.CloudStoreLogin,
				options: {}
			});
		}

		return {
			screenStack: screenStack,
			currentScreen: 0
		};
	}

	componentDidMount() {
		if (this.props.fs.isLoggedIn()) {
			this.props.fs.accountInfo().then((info) => {
				this.setState({ accountInfo: info });
			});
		}

		if (isResumingOAuthLogin()) {
			this.completeCloudServiceLogin();
		}
	}

	private pushScreen(screen: Screen, options?: ScreenOptions) {
		var screens = this.state.screenStack.slice(0, this.state.currentScreen + 1);
		screens.push({
			id: screen,
			options: options || {}
		});
		this.setState({
			screenStack: screens
		});
		setTimeout(() => {
			this.setState({ currentScreen: this.state.currentScreen + 1 });
		}, 100);
	}

	private popScreen() {
		var nextScreen = this.state.currentScreen - 1;
		while (this.state.screenStack[nextScreen].options.temporary) {
			--nextScreen;
		}
		this.setState({
			currentScreen: nextScreen
		});
	}

	render() {
		var screens: react.ReactElement<any>[] = [];
		for (var i = 0; i < this.state.screenStack.length; i++) {
			var xTranslation = i - this.state.currentScreen;
			var opacity = i == this.state.currentScreen ? 1.0 : 0.0;
			var screenKey: string;
			var screenContent: react.ReactElement<any>;

			switch (this.state.screenStack[i].id) {
				case Screen.Welcome:
					screenKey = 'screen-welcome';
					screenContent = this.renderWelcomeScreen();
					break;
				case Screen.StoreList:
					screenKey = 'screen-store-list';
					screenContent = this.renderStoreList();
					break;
				case Screen.NewStore:
					screenKey = 'screen-new-store';
					screenContent = this.renderNewStoreScreen();
					break;
				case Screen.CloudStoreLogin:
					screenKey = 'screen-cloud-store-login';
					screenContent = this.renderProgressSlide('Connecting to Dropbox...');
					break;
				case Screen.CloudStoreSignout:
					screenKey = 'screen-cloud-store-signout';
					screenContent = this.renderProgressSlide('Signing out of Dropbox...');
					break;
				case Screen.CloudStoreList:
					screenKey = 'screen-cloud-store-list';
					screenContent = this.renderCloudStoreList();
					break;
				case Screen.CloudServiceList:
					screenKey = 'screen-cloud-service-list';
					screenContent = this.renderCloudServiceList();
					break;
			}

			screens.push(SlideF({
				key: screenKey,
				xTranslation: xTranslation,
				opacity: opacity
			}, screenContent));
		}

		var message: react.ReactElement<toaster.ToasterProps>;
		if (this.state.status) {
			message = toaster.ToasterF({
				message: this.state.status.text
			});
		}

		return react.DOM.div(style.mixin(theme.setupView),
			react.DOM.div(style.mixin(theme.setupView.inner),
				screens,
				reactutil.TransitionGroupF({}, message)
				)
			);
	}

	private reportError(err: string | Error) {
		var status = status_message.Status.withError(err);
		status.expired.listen(() => {
			this.setState({ status: null });
		});
		this.setState({ status: status });
	}

	private renderWelcomeScreen() {
		return react.DOM.div({},
			react.DOM.div(style.mixin(theme.header), 'Passcards'),
			react.DOM.div(style.mixin(theme.screenButtons),
				NavButtonF({
					label: 'Continue',
					onClick: () => {
						this.pushScreen(Screen.StoreList);
					}
				})
				)
			);
	}

	private renderCloudServiceList() {
		return react.DOM.div({},
			react.DOM.div(style.mixin(theme.screenButtons),
				NavButtonF({
					label: 'Back',
					onClick: () => {
						this.popScreen();
					}
				}),
				NavButtonF({
					label: 'Connect to Dropbox',
					onClick: () => {
						this.connectToDropbox();
					}
				})
				)
			);
	}

	private completeCloudServiceLogin() {
		var loggedIn = Q(null);
		if (!this.props.fs.isLoggedIn()) {
			// if completeCloudServiceLogin() is called and
			// isLoggedIn() returns false, this means that
			// the app has been reloaded after an OAuth redirect
			// has completed. Call login() to complete the OAuth
			// login process.
			loggedIn = this.props.fs.login();
		}
		loggedIn.then(() => {
			return this.props.fs.accountInfo()
		}).then((accountInfo) => {
			this.setState({
				accountInfo: accountInfo
			});
			this.pushScreen(Screen.CloudStoreList);
		}).catch((err) => {
			// go back to store list
			this.popScreen();
			this.reportError(err);
		});
	}

	private connectToDropbox() {
		this.pushScreen(Screen.CloudStoreLogin, { temporary: true });

		this.props.fs.login().then(() => {
			// depending on the environment, the login
			// will either complete in this instance of the app,
			// or the app will reload and the login completion
			// will be handled by componentDidMount()
			this.completeCloudServiceLogin();
		}).catch((err) => {
			// go back to store list
			this.popScreen();
			this.reportError(err);
		});
	}

	private renderStoreList() {
		var stores = <settings.AccountMap>this.props.settings.get(settings.Setting.Accounts) || {};
		return react.DOM.div({},
			react.DOM.div(style.mixin(theme.header), 'Select Store'),
			StoreListF({
				stores: stores,
				onSelectStore: (account) => {
					this.props.settings.set(settings.Setting.ActiveAccount, account.id);
				},
				onAddStore: () => {
					this.pushScreen(Screen.CloudServiceList);
				}
			})
			);
	}

	private renderNewStoreScreen() {
		return NewStoreFormF({
			onGoBack: () => {
				this.popScreen();
			},
			onCreate: (options) => {
				var store = agile_keychain.Vault.createVault(this.props.fs,
					options.path, options.password, options.hint);

				return store.then((store) => {
					this.onSelectStore(store.vaultPath());
				}).catch((err) => {
					this.reportError(err);
					throw err;
				});
			}
		});
	}

	private onSelectStore(path: string) {
		var account: settings.Account = {
			id: null,
			cloudService: settings.CloudService.Dropbox,
			cloudAccountId: this.state.accountInfo.userId,
			name: this.state.accountInfo.name,
			storePath: path
		};
		account.id = settings.accountKey(account);

		var appSettings = this.props.settings;
		var stores = <settings.AccountMap>appSettings.get(settings.Setting.Accounts) || {};
		stores[account.id] = account;
		appSettings.set(settings.Setting.Accounts, stores);
		appSettings.set(settings.Setting.ActiveAccount, account.id);
	}

	private renderProgressSlide(text: string) {
		return react.DOM.div(style.mixin(theme.header), text);
	}

	private renderCloudStoreList() {
		var accountName = 'your';
		if (this.state.accountInfo) {
			accountName = `${this.state.accountInfo.name}'s`;
		}

		return react.DOM.div({},
			react.DOM.div(style.mixin(theme.header), `Select store in ${accountName} Dropbox`),
			CloudStoreListF({
				vfs: this.props.fs,
				onSelectStore: (path) => {
					this.onSelectStore(path);
				}
			}),
			react.DOM.div(style.mixin(theme.screenButtons),
				NavButtonF({
					label: 'Back',
					onClick: () => {
						this.popScreen();
					}
				}),
				NavButtonF({
					label: 'Create New Store',
					onClick: () => {
						this.pushScreen(Screen.NewStore);
					}
				}),
				react.DOM.div(style.mixin(theme.screenButtons.spacer)),
				NavButtonF({
					label: 'Sign Out',
					onClick: () => {
						this.popScreen();
						this.pushScreen(Screen.CloudStoreSignout, { temporary: true });
						this.props.fs.logout().then(() => {
							this.popScreen();
						}).catch((err) => {
							this.popScreen();
							this.reportError(err);
						});
					}
				})
				)
			);
	}
}

export var SetupViewF = reactutil.createFactory(SetupView);
