/// <reference path="../typings/react-0.12.d.ts" />

import Q = require('q');
import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import agile_keychain = require('../lib/agile_keychain');
import button = require('./controls/button');
import colors = require('./controls/colors');
import reactutil = require('./base/reactutil');
import ripple = require('./controls/ripple');
import settings = require('./settings');
import style_util = require('./base/style_util');
import text_field = require('./controls/text_field');
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
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center'
	}
});

interface NavButtonProps {
	label: string;
	onClick: () => void;
	iconUrl?: string;
}

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

interface StoreListProps {
	vfs: vfs.VFS;
	onSelectStore: (path: string) => void;
}

interface Store {
	path: string;
}

interface StoreListState {
	stores?: Store[];
	error?: Error;
}

/** Displays a list of available password stores in a cloud file system */
class StoreList extends typed_react.Component<StoreListProps, StoreListState> {
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
				return react.DOM.div(style.mixin(theme.storeList),
				  `Unable to search Dropbox for existing stores: ${this.state.error.message}`,
					  react.DOM.div(style.mixin(theme.screenButtons),
						NavButtonF({
							label: 'Try Again',
							onClick: () => {
								this.setState({error: null});
								this.startSearch();
							}
						})
					)
				);
			} else {
				return react.DOM.div(style.mixin(theme.storeList), 
					react.DOM.div(style.mixin(theme.storeList.item), 'Searching for existing stores...')
				);
			}
		} else {
			return react.DOM.div(style.mixin(theme.storeList), this.state.stores.map((store) => {
				var displayPath = store.path.slice(1);
				return react.DOM.div(style.mixin(theme.storeList.item, {
					key: store.path,
					onClick: () => {
						this.props.onSelectStore(store.path);
					}
				}), ripple.InkRippleF({}), displayPath);
			}));
		}
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
	ConnectToCloudService,
	NewStore,
	SelectStore,
	Connecting
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
}

/** App setup and onboarding screen.
  */
export class SetupView extends typed_react.Component<SetupViewProps, SetupViewState> {
	getInitialState() {
		var account = this.props.settings.get(settings.Setting.ActiveAccount);
		var initialScreen = Screen.ConnectToCloudService;
		if (account) {
			initialScreen = Screen.Connecting;
		} else if (this.props.fs.isLoggedIn()) {
			initialScreen = Screen.SelectStore;
		}

		return {
			currentScreen: initialScreen
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
		case Screen.ConnectToCloudService:
			currentScreen = SlideF({key: 'screen-connect-dropbox'}, this.renderConnectToCloudServiceScreen());
			break;
		case Screen.NewStore:
			currentScreen = SlideF({key: 'screen-new-store'}, this.renderNewStoreScreen());
			break;
		case Screen.SelectStore:
			currentScreen = SlideF({key: 'screen-select-store'}, this.renderSelectStoreScreen());
			break;
		case Screen.Connecting:
			currentScreen = SlideF({key: 'screen-connect-store'},
				react.DOM.div({}, 'Connecting to Store')
			);
			break;
		}

		return react.DOM.div(style.mixin(theme.setupView),
			react.DOM.div(style.mixin(theme.setupView.inner),
				reactutil.TransitionGroupF({},
					currentScreen
				)
			)
		);
	}

	private renderWelcomeScreen() {
		return react.DOM.div({}, 'Passcards',
			react.DOM.div(style.mixin(theme.screenButtons),
				NavButtonF({
					label: 'Continue',
					onClick: () => {
						this.setState({currentScreen: Screen.ConnectToCloudService});
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
				currentScreen: Screen.SelectStore
			});
		}).done();
	}

	private renderConnectToCloudServiceScreen() {
		return react.DOM.div({}, 'Where do you want Passcards to store your passwords?',
			react.DOM.div(style.mixin(theme.cloudServiceList),
				button.ButtonF({
					style: button.Style.RaisedRectangular,
					backgroundColor: 'white',
					color: 'black',
					value: '',
					onClick: () => {
						this.props.fs.login().then(() => {
							// depending on the environment, the login
							// will either complete in this instance of the app,
							// or the app will reload and the login completion
							// will be handled by componentDidMount()
							this.completeCloudServiceLogin();
						});
					}
				},
					react.DOM.img({
						src: 'icons/dropbox-logotype-blue.svg',
						height: 64
					})
				)
			)
		);
	}

	private renderNewStoreScreen() {
		var newStore: NewStoreOptions = {
			path: 'Passcards/Passcards.agilekeychain'
		};

		return react.DOM.div({}, 'Setup new store',
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
					onClick: () => this.setState({currentScreen: Screen.SelectStore})
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
		this.props.settings.set(settings.Setting.ActiveAccount, {
			cloudService: settings.CloudService.Dropbox,
			accountName: this.state.accountInfo.userId,
			storePath: path
		});
		this.setState({currentScreen: Screen.Connecting});
	}

	private renderSelectStoreScreen() {
		var accountName = 'your';
		if (this.state.accountInfo) {
			accountName = `${this.state.accountInfo.name}'s`;
		}

		return react.DOM.div({}, `Select store in ${accountName} Dropbox` ,
			StoreListF({
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
							this.setState({currentScreen: Screen.ConnectToCloudService});
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

