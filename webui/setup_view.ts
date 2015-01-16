/// <reference path="../typings/react-0.12.d.ts" />

import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import agile_keychain = require('../lib/agile_keychain');
import button = require('./controls/button');
import colors = require('./controls/colors');
import reactutil = require('./base/reactutil');
import settings = require('./settings');
import text_field = require('./controls/text_field');
import vfs = require('../lib/vfs/vfs');

var theme = style.create({
	setupView: {
		width: '100%',
		height: '100%',
		backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
		color: 'white'
	}
});

interface StoreListProps {
	vfs: vfs.VFS;
	onSelectStore: (path: string) => void;
	onNewStore: () => void;
}

interface Store {
	path: string;
}

interface StoreListState {
	stores?: Store[];
}

/** Displays a list of available password stores in a cloud file system */
class StoreList extends typed_react.Component<StoreListProps, StoreListState> {
	getInitialState() {
		return {};
	}

	componentDidMount() {
		this.props.vfs.search('.agilekeychain', (files) => {
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

	render() {
		if (!this.state.stores) {
			return react.DOM.div({}, 'Searching for existing stores...');
		} else {
			return react.DOM.div({}, this.state.stores.map((store) => {
				return react.DOM.div({
					onClick: () => {
						this.props.onSelectStore(store.path);
					}
				}, store.path);
			}),
				button.ButtonF({
					style: button.Style.RaisedRectangular,
					value: 'Create New Store',
					onClick: () => {
						this.props.onNewStore();
					}
				})
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
	DropboxConnect,
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

interface SetupViewState {
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

	render() {
		var currentScreen: React.ReactElement<any>;
		switch (this.state.currentScreen) {
		case Screen.Welcome:
			return this.renderWelcomeScreen();
			break;
		case Screen.DropboxConnect:
			return this.renderDropboxConnectScreen();
			break;
		case Screen.NewStore:
			return this.renderNewStoreScreen();
			break;
		case Screen.SelectStore:
			return this.renderSelectStoreScreen();
		case Screen.Connecting:
			return react.DOM.div({}, 'Connecting to Store');
		}

		return react.DOM.div(style.mixin(theme.setupView),
			currentScreen
		);
	}

	private renderWelcomeScreen() {
		return react.DOM.div({}, 'Welcome to Passcards',
			button.ButtonF({
				style: button.Style.RaisedRectangular,
				value: 'Continue',
				onClick: () => {
					this.setState({currentScreen: Screen.DropboxConnect});
				}
			})
		);
	}

	private renderDropboxConnectScreen() {
		return react.DOM.div({}, 'Connect to Dropbox',
			button.ButtonF({
				style: button.Style.RaisedRectangular,
				value: 'Connect to Dropbox',
				onClick: () => {
					this.props.fs.login().then(() => {
						this.setState({currentScreen: Screen.SelectStore});
					});
				}
			})
		);
	}

	private renderNewStoreScreen() {
		var newStore: NewStoreOptions = {
			path: 'Passcards/Passcards.agilekeychain'
		};

		return react.DOM.div({}, 'Setup new store',
			text_field.TextFieldF({
				type: 'text',
				defaultValue: newStore.path,
				floatingLabel: true,
				placeHolder: 'Location',
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
			}),
			button.ButtonF({
				style: button.Style.RaisedRectangular,
				value: 'Create Store',
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
						console.log('Failed to create store');
					});
				}
			})
		);
	}

	private onSelectStore(path: string) {
		this.props.settings.set(settings.Setting.ActiveAccount, {
			cloudService: settings.CloudService.Dropbox,
			accountName: this.props.fs.accountName(),
			storePath: path
		});
		this.setState({currentScreen: Screen.Connecting});
	}

	private renderSelectStoreScreen() {
		return react.DOM.div({}, 'Select store',
			StoreListF({
				vfs: this.props.fs,
				onSelectStore: (path) => {
					this.onSelectStore(path);
				},
				onNewStore: () => {
					this.setState({currentScreen: Screen.NewStore});
				}
			})
		);
	}
}

export var SetupViewF = reactutil.createFactory(SetupView);

