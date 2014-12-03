/// <reference path="../typings/react-0.12.d.ts" />

// View for entering master password and unlocking the store

import react = require('react');
import typed_react = require('typed-react');

import colors = require('./colors');
import focus_mixin = require('./base/focus_mixin');
import item_store = require('../lib/item_store');
import reactutil = require('./reactutil');
import style = require('./base/style');

var styles = style.create({
	unlockPane: {
		upper: {
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: '60%',
			boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px 5px 0px',
			zIndex: '2'
		},

		lower: {
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			position: 'absolute',
			left: 0,
			top: '40%',
			right: 0,
			bottom: 0,
			boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px -5px 0px',
			zIndex: '1'
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

		masterPasswordField: {
			padding: 5,
			border: '1px solid #fff',
			borderRadius: 5,
			fontSize: 18,
			fontWeight: '400',
			color: colors.MATERIAL_COLOR_HEADER,
			backgroundColor: colors.MATERIAL_COLOR_ACCENT3,
			outline: 'none'
		},

		'masterPasswordField::-webkit-input-placeholder': {
			color: '#fff',
			opacity: '0.8'
		},

		unlockLabel: {
			width: '100%',
			marginTop: 5,
			color: 'white',
			fontSize: 14,
			fontWeight: 'bold'
		}
	}
});

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

	private setFocus() {
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

		var unlockPaneUpper: react.ReactElement<any,any>;
		var unlockPaneLower: react.ReactElement<any,any>;

		if (this.props.isLocked) {
			unlockPaneUpper = react.DOM.div({className: style.classes(styles.unlockPane.upper)},
				react.DOM.div({className: style.classes(styles.unlockPane.form)},
					react.DOM.form({
						className: style.classes(styles.unlockPane.inputPane),
						ref:'unlockPaneForm',
						onSubmit: (e) => {
							e.preventDefault();
							var masterPass = (<HTMLInputElement>this.refs['masterPassField'].getDOMNode()).value;
							this.tryUnlock(masterPass);
						}
					},
						react.DOM.input({
							className: style.classes(styles.unlockPane.masterPasswordField),
							type: 'password',
							placeholder: 'Master Password...',
							ref: 'masterPassField',
							autoFocus: true
						}),
						react.DOM.div({className: style.classes(styles.unlockPane.unlockLabel)}, unlockMessage)
					)
				)
			);
			unlockPaneLower = react.DOM.div({className: style.classes(styles.unlockPane.lower)});
		}

		return react.DOM.div({className: style.classes(styles.unlockPane)},
			reactutil.CSSTransitionGroupF({
				transitionName: 'slide-from-top'
			}, unlockPaneUpper),
			reactutil.CSSTransitionGroupF({
				transitionName: 'slide-from-bottom'
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

