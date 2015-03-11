/// <reference path="../typings/react.d.ts" />

// View for entering master password and unlocking the store

import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import button = require('./controls/button');
import colors = require('./controls/colors');
import focus_mixin = require('./base/focus_mixin');
import fonts = require('./controls/fonts');
import item_store = require('../lib/item_store');
import reactutil = require('./base/reactutil');
import app_theme = require('./theme');

var UNLOCK_VIEW_Z_LAYER = 20;

var theme = style.create({
	upper: {
		backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: '60%',
		boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px 5px 0px',
		zIndex: UNLOCK_VIEW_Z_LAYER + 1
	},

	lower: {
		backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
		position: 'absolute',
		left: 0,
		top: '40%',
		right: 0,
		bottom: 0,
		boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px -5px 0px',
		zIndex: UNLOCK_VIEW_Z_LAYER
	},

	form: {
		backgroundColor: colors.MATERIAL_COLOR_ACCENT3,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		height: '75%'
	},

	inputPane: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		width: '50%',
		minWidth: 200,
		maxWidth: 300,
		marginLeft: 'auto',
		marginRight: 'auto',
		marginTop: '10%'
	},

	passwordRow: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center'
	},

	masterPasswordField: {
		padding: 5,
		border: '1px solid #fff',
		borderRadius: 5,
		fontSize: 18,
		fontWeight: '400',
		color: colors.MATERIAL_COLOR_HEADER,
		backgroundColor: colors.MATERIAL_COLOR_ACCENT3,
		outline: 'none',

		// force a small enough min width that the
		// whole unlock view is visible when viewport
		// is 3-400px wide.
		minWidth: 175,

		'::-webkit-input-placeholder': {
			color: '#fff',
			opacity: '0.8'
		}
	},

	unlockLabel: {
		width: '100%',
		marginTop: 5,
		color: 'white',
		fontSize: fonts.body1.size,
		fontWeight: fonts.body1.weight
	}
}, __filename);

enum UnlockState {
	Locked,
	Unlocking,
	Failed,
	Success
}

interface UnlockViewState {
	unlockState?: UnlockState;
	failedUnlockCount?: number;
}

export class UnlockViewProps {
	store: item_store.Store;
	isLocked: boolean;
	onUnlock: () => void;
	onUnlockErr: (error: Error) => void;
	onMenuClicked: (rect: reactutil.Rect) => void;
	focus: boolean;
}

export class UnlockView extends typed_react.Component<UnlockViewProps, UnlockViewState> {
	getInitialState() {
		return {
			unlockState: UnlockState.Locked,
			failedUnlockCount: 0
		};
	}

	setFocus() {
		if (this.props.isLocked) {
			var masterPassField = this.refs['masterPassField'];
			(<HTMLElement>masterPassField.getDOMNode()).focus();
		}
	}

	render() {
		var unlockMessage: string;
		if (this.state.unlockState == UnlockState.Unlocking) {
			unlockMessage = 'Unlocking...';
		} else if (this.state.unlockState == UnlockState.Failed) {
			unlockMessage = '';
		}

		var unlockPaneUpper: React.ReactElement<any>;
		var unlockPaneLower: React.ReactElement<any>;

		if (this.props.isLocked) {
			unlockPaneUpper = react.DOM.div(style.mixin(theme.upper),
				react.DOM.div(style.mixin(theme.form),
					react.DOM.form({
						className: style.classes(theme.inputPane),
						ref: 'unlockPaneForm',
						onSubmit: (e) => {
							e.preventDefault();
							var passwordInputField = <HTMLInputElement>this.refs['masterPassField'].getDOMNode();
							var masterPass = passwordInputField.value;
							this.tryUnlock(masterPass).then(() => {
								// clear input field after attempt completes
								passwordInputField.value = '';
							});
						}
					},
						react.DOM.div(style.mixin(theme.passwordRow),
							react.DOM.input(style.mixin(theme.masterPasswordField, {
								type: 'password',
								placeholder: 'Master Password...',
								ref: 'masterPassField',
								autoFocus: true
							})),
							button.ButtonF({
								style: button.Style.Icon,
								color: colors.TOOLBAR_ICON,
								rippleColor: colors.TOOLBAR_ICON,
								value: 'App Menu',
								iconUrl: 'dist/icons/icons.svg#menu',
								ref: 'menuButton',
								onClick: (e) => {
									e.preventDefault();
									var itemRect = (<HTMLElement>this.refs['menuButton'].getDOMNode()).getBoundingClientRect();
									this.props.onMenuClicked(itemRect);
								}
							})
							),
						react.DOM.div(style.mixin(theme.unlockLabel), unlockMessage)
						)
					)
				);
			unlockPaneLower = react.DOM.div(style.mixin(theme.lower));
		}

		return react.DOM.div({},
			reactutil.CSSTransitionGroupF({
				transitionName: style.classes(app_theme.animations.slideFromTop)
			}, unlockPaneUpper),
			reactutil.CSSTransitionGroupF({
				transitionName: style.classes(app_theme.animations.slideFromBottom)
			}, unlockPaneLower)
			);
	}

	private tryUnlock(password: string) {
		this.setState({ unlockState: UnlockState.Unlocking });
		return this.props.store.unlock(password).then(() => {
			this.setState({ unlockState: UnlockState.Success });
			this.props.onUnlock();
		})
		.catch((err) => {
			this.setState({
				failedUnlockCount: this.state.failedUnlockCount + 1,
				unlockState: UnlockState.Failed
			});

			if (this.state.failedUnlockCount < 3) {
				this.props.onUnlockErr(err);
			} else {
				this.props.store.passwordHint().then((hint) => {
					if (!hint) {
						hint = '(No password hint set)';
					}
					this.props.onUnlockErr(new Error(err.message + '. Hint: ' + hint));
				}).catch((hintErr) => {
					this.props.onUnlockErr(new Error(err.message + '. Hint: ' + hintErr.message));
				});
			}
		});
	}
}

export var UnlockViewF = reactutil.createFactory(UnlockView, focus_mixin.FocusMixinM);

