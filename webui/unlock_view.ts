/// <reference path="../typings/react-0.12.d.ts" />

// View for entering master password and unlocking the store

import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import button = require('./controls/button');
import colors = require('./controls/colors');
import focus_mixin = require('./base/focus_mixin');
import item_store = require('../lib/item_store');
import reactutil = require('./base/reactutil');
import theme = require('./theme');

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
		var unlockMessage : string;
		if (this.state.unlockState == UnlockState.Unlocking) {
			unlockMessage = 'Unlocking...';
		} else if (this.state.unlockState == UnlockState.Failed) {
			unlockMessage = '';
		}

		var unlockPaneUpper: React.ReactElement<any>;
		var unlockPaneLower: React.ReactElement<any>;

		if (this.props.isLocked) {
			unlockPaneUpper = react.DOM.div(style.mixin(theme.unlockView.upper),
				react.DOM.div(style.mixin(theme.unlockView.form),
					react.DOM.form({
						className: style.classes(theme.unlockView.inputPane),
						ref:'unlockPaneForm',
						onSubmit: (e) => {
							e.preventDefault();
							var masterPass = (<HTMLInputElement>this.refs['masterPassField'].getDOMNode()).value;
							this.tryUnlock(masterPass);
						}
					},
						react.DOM.div(style.mixin(theme.unlockView.passwordRow),
							react.DOM.input({
								className: style.classes(theme.unlockView.masterPasswordField),
								type: 'password',
								placeholder: 'Master Password...',
								ref: 'masterPassField',
								autoFocus: true
							}),
							button.ButtonF({
								style: button.Style.Icon,
								color: colors.TOOLBAR_ICON,
								rippleColor: colors.TOOLBAR_ICON,
								value: 'App Menu',
								iconUrl: 'icons/icons.svg#menu',
								ref: 'menuButton',
								onClick: (e) => {
									e.preventDefault();
									var itemRect = (<HTMLElement>this.refs['menuButton'].getDOMNode()).getBoundingClientRect();
									this.props.onMenuClicked(itemRect);
								}
							})
						),
						react.DOM.div(style.mixin(theme.unlockView.unlockLabel), unlockMessage)
					)
				)
			);
			unlockPaneLower = react.DOM.div(style.mixin(theme.unlockView.lower));
		}

		return react.DOM.div(style.mixin(theme.unlockView),
			reactutil.CSSTransitionGroupF({
				transitionName: style.classes(theme.animations.slideFromTop)
			}, unlockPaneUpper),
			reactutil.CSSTransitionGroupF({
				transitionName: style.classes(theme.animations.slideFromBottom)
			}, unlockPaneLower)
		);
	}

	private tryUnlock(password: string) {
		this.setState({unlockState: UnlockState.Unlocking});
		this.props.store.unlock(password).then(() => {
			this.setState({unlockState: UnlockState.Success});
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

