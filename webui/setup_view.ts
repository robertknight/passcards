/// <reference path="../typings/react-0.12.d.ts" />

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
		alignItems: 'center'
	},

	storeList: {
		marginTop: 10,
		marginBottom: 10,

		item: {
			padding: 5,
			paddingTop: 5,
			paddingBottom: 5,
			cursor: 'pointer',
			position: 'relative',
			overflow: 'hidden',
			userSelect: 'none'
		}
	},

	newStore: {
		margin: 10
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
	}
});

function screenNavButton(label: string, onClick: () => void) {
	return button.ButtonF({
		style: button.Style.RaisedRectangular,
		backgroundColor: 'white',
		value: label,
		onClick: onClick
	});
}

interface StoreListProps {
	vfs: vfs.VFS;
	onSelectStore: (path: string) => void;
	onNewStore: () => void;
	onChangeCloudService: () => void;
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
						screenNavButton('Try Again', () => {
							this.setState({error: null});
							this.startSearch();
						})
					)
				)
			} else {
				return react.DOM.div(style.mixin(theme.storeList), 'Searching for existing stores...');
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
			}),
				react.DOM.div(style.mixin(theme.screenButtons),
					screenNavButton('Back', () => {
						this.props.onChangeCloudService();
					}),
					screenNavButton('Create New Store', () => this.props.onNewStore())
				)
			);
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
		var initialScreen = Screen.Welcome;
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
			reactutil.TransitionGroupF({},
				currentScreen
			)
		);
	}

	private renderWelcomeScreen() {
		return react.DOM.div({}, 'Welcome to Passcards',
			react.DOM.div(style.mixin(theme.screenButtons),
				screenNavButton('Continue', () => {
					this.setState({currentScreen: Screen.ConnectToCloudService});
				})
			)
		);
	}

	private renderConnectToCloudServiceScreen() {
		return react.DOM.div({}, 'Where do you want Passcards to store your data?',
			react.DOM.div(style.mixin(theme.screenButtons),
				screenNavButton('Dropbox', () => {
					this.props.fs.login().then(() => {
						return this.props.fs.accountInfo();
					}).then((accountInfo) => {
						this.setState({
							accountInfo: accountInfo,
							currentScreen: Screen.SelectStore
						});
					});
				})
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
				screenNavButton('Back', () => this.setState({currentScreen: Screen.SelectStore})),
				screenNavButton('Create Store', () => {
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
				},
				onNewStore: () => {
					this.setState({currentScreen: Screen.NewStore});
				},
				onChangeCloudService: () => {
					this.props.fs.login().then(() => {
						this.setState({currentScreen: Screen.ConnectToCloudService});
					});
				}
			})
		);
	}
}

export var SetupViewF = reactutil.createFactory(SetupView);

