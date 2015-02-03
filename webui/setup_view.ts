/// <reference path="../typings/react-0.12.d.ts" />

import Q = require('q');
import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import agile_keychain = require('../lib/agile_keychain');
import button = require('./controls/button');
import colors = require('./controls/colors');
import fonts = require('./controls/fonts');
import reactutil = require('./base/reactutil');
import ripple = require('./controls/ripple');
import settings = require('./settings');
import status_message = require('./status');
import style_util = require('./base/style_util');
import text_field = require('./controls/text_field');
import toaster = require('./controls/toaster');
import transition_mixin = require('./base/transition_mixin');
import vfs = require('../lib/vfs/vfs');

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
		marginTop: 10,
		marginBottom: 10,
		borderRadius: 3,
		backgroundColor: 'white',
		color: colors.MATERIAL_COLOR_PRIMARY,

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
		marginTop: 10,
		marginBottom: 10,
		borderRadius: 3,
		backgroundColor: 'white',
		color: colors.MATERIAL_TEXT_PRIMARY,
		minHeight: 40,

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
		marginTop: 10,
		marginBottom: 10,
		padding: 10,
		backgroundColor: 'white',
		borderRadius: 3
	},

	screen: {
		transition: style_util.transitionOn({
			transform: .3,
			opacity: .6
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
		flexDirection: 'row'
	},

	cloudServiceList: {
		padding: 20,
		marginTop: 50,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center'
	},

	header: {
		fontSize: fonts.title.size,
		fontWeight: fonts.title.weight,
		marginTop: 10,
		marginBottom: 15,
		textAlign: 'center'
	}
});

interface NavButtonProps {
	label: string;
	onClick: () => void;
	iconUrl?: string;
}

/** Button displayed at the bottom of the setup view
  * to go to the previous/next steps.
  */
class NavButton extends typed_react.Component<NavButtonProps,{}> {
	render() {
		return button.ButtonF({
			style: button.Style.RaisedRectangular,
			backgroundColor: 'white',
			value: this.props.label,
			iconUrl: this.props.iconUrl,
			color: 'black',
			onClick: this.props.onClick
		});
	}
}
var NavButtonF = reactutil.createFactory(NavButton);

interface CloudStoreListProps {
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
				this.setState({error: error});
				return;
			}

			var stores = this.state.stores || <Store[]>[];
			stores = stores.concat(files.map((file) => {
				return {path: file.path};
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
								this.setState({error: null});
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
				var displayPath = store.path.slice(1);
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

interface StoreListProps {
	stores: settings.AccountMap;
	onSelectStore: (account: settings.Account) => void;
	onAddStore: () => void;
}

class StoreList extends typed_react.Component<StoreListProps, {}> {
	render() {
		var stores: React.ReactElement<any>[] = [];
		Object.keys(this.props.stores).forEach((id) => {
			var account = this.props.stores[id];
			var suffixPos = account.storePath.lastIndexOf('.');

			// trim leading '/' and directory/file extension
			var displayPath = account.storePath.slice(1, suffixPos);

			var cloudService = settings.CloudService[account.cloudService];

			stores.push(react.DOM.div(style.mixin(theme.storeList.item, {
				onClick: () => this.props.onSelectStore(account)
			}),
				react.DOM.div(style.mixin(theme.storeList.item.path), displayPath),
				react.DOM.div(style.mixin(theme.storeList.item.store),
					`in ${account.name}'s ${cloudService}`),
				ripple.InkRippleF({})
			));
		});

		stores.push(react.DOM.div(style.mixin(theme.storeList.item, {
			onClick: () => this.props.onAddStore()
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

export interface SetupViewProps {
	settings: settings.Store;
	fs: vfs.VFS;
}

// active screen in the setup / onboarding dialog
enum Screen {
	Welcome,
	StoreList,
	NewStore,
	CloudStoreList
}

interface NewStoreOptions {
	path?: string;
	password?: string;
	confirmPassword?: string;
	hint?: string;
}

interface SlideProps {
	children?: React.ReactElement<any>[];
}

interface SlideState extends transition_mixin.TransitionMixinState {
}

class Slide extends typed_react.Component<SlideProps, SlideState> {
	getInitialState() {
		return {
			transitionProperty: 'transform'
		}
	}

	render() {
		var screenStyles: any[] = [theme.screen];
		switch (this.state.transition) {
		case reactutil.TransitionState.Entering:
			screenStyles.push({
				transform: 'translateX(100%)',
				opacity: 0.1
			});
			break;
		case reactutil.TransitionState.Leaving:
			screenStyles.push({
				transform: 'translateX(-100%)',
				opacity: 0.1
			});
			break;
		}

		return react.DOM.div(style.mixin(screenStyles),
			this.props.children
		);
	}
}

var SlideF = reactutil.createFactory(Slide, transition_mixin.TransitionMixinM);

interface SetupViewState {
	accountInfo?: vfs.AccountInfo;
	currentScreen?: Screen;
	newStore?: NewStoreOptions;
	status?: status_message.Status;
}

/** App setup and onboarding screen.
  */
export class SetupView extends typed_react.Component<SetupViewProps, SetupViewState> {
	getInitialState() {
		return {
			currentScreen: Screen.StoreList
		};
	}

	componentDidMount() {
		if (this.props.fs.isLoggedIn()) {
			this.props.fs.accountInfo().then((info) => {
				this.setState({accountInfo: info});
			});
		}

		if (window.location.hash.indexOf('access_token') !== -1) {
			// resume OAuth login flow
			this.completeCloudServiceLogin();
		}
	}

	render() {
		var currentScreen: React.ReactElement<any>;
		switch (this.state.currentScreen) {
		case Screen.Welcome:
			currentScreen = SlideF({key: 'screen-welcome'}, this.renderWelcomeScreen());
			break;
		case Screen.StoreList:
			currentScreen = SlideF({key: 'screen-store-list'}, this.renderStoreList());
			break;
		case Screen.NewStore:
			currentScreen = SlideF({key: 'screen-new-store'}, this.renderNewStoreScreen());
			break;
		case Screen.CloudStoreList:
			currentScreen = SlideF({key: 'screen-cloud-store-list'}, this.renderCloudStoreList());
			break;
		}

		var message: React.ReactElement<toaster.ToasterProps>;
		if (this.state.status) {
			message = toaster.ToasterF({
				message: this.state.status.text
			});
		}

		return react.DOM.div(style.mixin(theme.setupView),
			react.DOM.div(style.mixin(theme.setupView.inner),
				reactutil.TransitionGroupF({},
					currentScreen
				),
				reactutil.TransitionGroupF({}, message)
			)
		);
	}

	private reportError(err: string | Error) {
		var status = status_message.Status.withError(err);
		status.expired.listen(() => {
			this.setState({status: null});
		});
		this.setState({status: status});
	}

	private renderWelcomeScreen() {
		return react.DOM.div({},
			react.DOM.div(style.mixin(theme.header), 'Passcards'),
			react.DOM.div(style.mixin(theme.screenButtons),
				NavButtonF({
					label: 'Continue',
					onClick: () => {
						this.setState({currentScreen: Screen.StoreList});
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
				accountInfo: accountInfo,
				currentScreen: Screen.CloudStoreList
			});
		}).catch((err) => {
			this.reportError(err);
		});
	}

	private renderStoreList() {
		var stores = <settings.AccountMap>this.props.settings.get(settings.Setting.Accounts) || {};
		var addStoreHandler = () => {
			this.props.fs.login().then(() => {
				// depending on the environment, the login
				// will either complete in this instance of the app,
				// or the app will reload and the login completion
				// will be handled by componentDidMount()
				this.completeCloudServiceLogin();
			}).catch((err) => {
				this.reportError(err);
			});
		};

		return react.DOM.div({},
			react.DOM.div(style.mixin(theme.header), 'Select Store'),
			StoreListF({
				stores: stores,
				onSelectStore: (account) => {
					this.props.settings.set(settings.Setting.ActiveAccount, account.id);
				},
				onAddStore: addStoreHandler
			})
		);
	}

	private renderNewStoreScreen() {
		var newStore: NewStoreOptions = {
			path: 'Passcards/Passcards.agilekeychain'
		};

		return react.DOM.div({},
			react.DOM.div(style.mixin(theme.header), 'Setup new store'),
			react.DOM.div(style.mixin(theme.newStore),
				text_field.TextFieldF({
					type: 'text',
					defaultValue: newStore.path,
					floatingLabel: true,
					placeHolder: 'Location in Dropbox',
					onChange: (e) => {
						newStore.path = (<HTMLInputElement>e.target).value;
					}
				}),
				text_field.TextFieldF({
					type: 'password',
					floatingLabel: true,
					placeHolder: 'Master Password',
					onChange: (e) => {
						newStore.password = (<HTMLInputElement>e.target).value;
					}
				}),
				text_field.TextFieldF({
					type: 'password',
					floatingLabel: true,
					placeHolder: 'Re-enter Master Password',
					onChange: (e) => {
						newStore.confirmPassword = (<HTMLInputElement>e.target).value;
					}
				}),
				text_field.TextFieldF({
					type: 'text',
					floatingLabel: true,
					placeHolder: 'Master password hint',
					onChange: (e) => {
						newStore.hint = (<HTMLInputElement>e.target).value;
					}
				})
			),
			react.DOM.div(style.mixin(theme.screenButtons),
				NavButtonF({
					label: 'Back',
					onClick: () => this.setState({currentScreen: Screen.CloudStoreList})
				}),
				NavButtonF({
					label: 'Create Store',
					onClick: () => {
						if (newStore.password !== newStore.confirmPassword) {
							// TODO - Display a message in the UI
							console.log('Passwords do not match');
							return;
						}

						var store = agile_keychain.Vault.createVault(this.props.fs,
						  newStore.path, newStore.password, newStore.hint);
						store.then((store) => {
							this.onSelectStore(newStore.path);
						}).catch((err) => {
							// TODO - Display a message in the UI
							console.log('Failed to create store');
						});
					}
				})
			)
		);
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
						this.props.fs.logout().then(() => {
							this.setState({currentScreen: Screen.StoreList});
						});
					}
				}),
				NavButtonF({
					label: 'Create New Store',
					onClick: () => {
						this.setState({currentScreen: Screen.NewStore});
					}
				})
			)
		);
	}
}

export var SetupViewF = reactutil.createFactory(SetupView);

