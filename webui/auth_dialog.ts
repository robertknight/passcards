import react = require('react');

import app_theme = require('./theme');
import auth = require('./auth');
import dialog = require('./controls/dialog');
import { TransitionContainerF } from './base/transition_container';

export interface AuthDialogProps extends react.Props<Element> {
    authServerURL: (redirectUrl: string, state?: string) => string;

    /** Callback triggered when the user either cancels
	 * the dialog or completes authentication.
	 */
    onComplete: (credentials?: auth.Credentials) => void;
}

enum AuthStep {
    PromptToSignIn,
    WaitingForAuth,
}

interface AuthDialogState {
    step?: AuthStep;
    leaving?: boolean;
    credentials?: auth.Credentials;
}

class AuthDialog extends react.Component<AuthDialogProps, AuthDialogState> {
    constructor(props: AuthDialogProps) {
        super(props, undefined);

        this.state = {
            step: AuthStep.PromptToSignIn,
            leaving: false,
        };
    }

    render() {
        let dialogText: string;
        let showSignInAction = false;

        if (this.state.step === AuthStep.PromptToSignIn) {
            dialogText =
                'You need to sign in to your Dropbox account to sync your passwords';
            showSignInAction = true;
        } else {
            dialogText = 'Waiting for sign in...';
        }

        let DIALOG_KEY = 'auth-dialog';
        let authDialog: react.ReactElement<{}>;
        if (!this.state.leaving) {
            authDialog = dialog.DialogF(
                {
                    key: DIALOG_KEY,
                    containerStyle: {
                        zIndex: app_theme.Z_LAYERS.MENU_LAYER,
                    },
                    acceptAction: showSignInAction
                        ? {
                              label: 'Sign In',
                              onSelect: () => {
                                  this.setState({
                                      step: AuthStep.WaitingForAuth,
                                  });
                                  this.showAuthWindow();
                              },
                          }
                        : undefined,
                    rejectAction: {
                        label: 'Cancel',
                        onSelect: () => this.leave(),
                    },
                },
                dialogText
            );
        }

        return TransitionContainerF(
            {
                onComponentRemoved: (key: string) => {
                    if (key === DIALOG_KEY) {
                        this.props.onComplete(this.state.credentials);
                    }
                },
            },
            authDialog
        );
    }

    private showAuthWindow() {
        let authFlow = new auth.OAuthFlow({
            authServerURL: this.props.authServerURL,
        });
        authFlow
            .authenticate(window)
            .then(credentials => {
                this.setState({ credentials });
                this.leave();
            })
            .catch(err => {
                this.leave();
            });
    }

    private leave() {
        this.setState({ leaving: true });
    }
}

export let AuthDialogF = react.createFactory(AuthDialog);
