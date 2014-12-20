/// <reference path="../typings/react-0.12.d.ts" />

// View for entering master password and unlocking the store

import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import div = require('./base/div');
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
			unlockPaneUpper = div(theme.unlockView.upper, {},
				div(theme.unlockView.form, {},
					react.DOM.form({
						className: style.classes(theme.unlockView.inputPane),
						ref:'unlockPaneForm',
						onSubmit: (e) => {
							e.preventDefault();
							var masterPass = (<HTMLInputElement>this.refs['masterPassField'].getDOMNode()).value;
							this.tryUnlock(masterPass);
						}
					},
						react.DOM.input({
							className: style.classes(theme.unlockView.masterPasswordField),
							type: 'password',
							placeholder: 'Master Password...',
							ref: 'masterPassField',
							autoFocus: true
						}),
						div(theme.unlockView.unlockLabel, {}, unlockMessage)
					)
				)
			);
			unlockPaneLower = div(theme.unlockView.lower, {});
		}

		return div(theme.unlockView, {},
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

