
import { load } from 'proxyquire';
import { Component } from 'react';
import { scryRenderedComponentsWithType } from 'react-addons-test-utils';
import { render } from 'react-dom';

import { addTest, Assert } from '../lib/test';
import { Button } from './controls/button';
import { runReactTest } from './test_utils';
import { defer } from '../lib/base/promise_util';

import * as auth_dialog from './auth_dialog';

class MockAuthFlow {
	options: any;

	constructor(options: any) {
		this.options = options;
	}

	authenticate() {
		return Promise.resolve({
			accessToken: 'mock-auth-token'
		});
	}
}

let {AuthDialogF } = load<typeof auth_dialog>('./auth_dialog', {
	'./auth': {
		OAuthFlow: MockAuthFlow
	}
});

function testDialog(assert: Assert, clickSignIn: boolean) {
	return runReactTest(element => {
		let receivedCredentials = defer<any>();
		let authServerURL = () => 'https://acmestorage.com/oauth2/authorize';

		// render the auth dialog
		let dialog = render(AuthDialogF({
			authServerURL,
			onComplete: (credentials: any) => receivedCredentials.resolve(credentials)
		}), element) as Component<auth_dialog.AuthDialogProps, {}>;

		// click on the 'Sign In' button and verify
		// that the auth dialog begins and the dialog text changes
		let buttons = scryRenderedComponentsWithType(dialog, Button) as any;
		if (clickSignIn) {
			buttons[1].props.onClick(null);
		} else {
			buttons[0].props.onClick(null);
		}

		// verify that the dialog invokes the onComplete() callback
		// with credentials once auth completes
		return receivedCredentials.promise.then(credentials => {
			if (clickSignIn) {
				assert.equal(credentials.accessToken, 'mock-auth-token');
			} else {
				assert.ok(!credentials);
			}
		});
	});
}

addTest('should prompt user to authenticate', assert => {
	return testDialog(assert, true /* click 'Sign In' */);
});

addTest('should return null credentials if auth is canceled', assert => {
	return testDialog(assert, false /* click 'Cancel' */);
});
