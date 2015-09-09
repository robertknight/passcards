import react = require('react');

import app_theme = require('./theme');
import dialog = require('./controls/dialog');

export interface AuthDialogProps {
	/** Callback triggered when the user either cancels
	 * the dialog or completes authentication.
	 */
	onComplete: () => void;
}

enum AuthStep {
	PromptToSignIn,
	WaitingForAuth
}

interface AuthDialogState {
	step: AuthStep;
}

class AuthDialog extends react.Component<AuthDialogProps, AuthDialogState> {
	constructor(props: AuthDialogProps) {
		super(props, undefined);

		this.state = {
			step: AuthStep.PromptToSignIn
		};
	}

	render() {
		let dialogText: string;
		let showSignInAction = false;

		if (this.state.step === AuthStep.PromptToSignIn) {
			dialogText = 'You need to sign in to your Dropbox account to sync';
			showSignInAction = true;
		} else {
			dialogText = 'Waiting for sign in...';
		}

		return dialog.DialogF({
			containerStyle: {
				zIndex: app_theme.Z_LAYERS.MENU_LAYER
			},
			acceptAction: showSignInAction ? {
				label: 'Sign In',
				onSelect: () => this.reauthenticate()
			} : undefined,
			rejectAction: {
				label: 'Cancel',
				onSelect: () => this.props.onComplete()
			}
		}, dialogText);
	}

	private reauthenticate() {
		this.setState({ step: AuthStep.WaitingForAuth });
	}
}

export let AuthDialogF = react.createFactory(AuthDialog);
