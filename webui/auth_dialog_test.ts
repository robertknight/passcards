
import { load } from 'proxyquire';
import { addons } from 'react/addons';
import { render } from 'react';
import * as Q from 'q';

import { addTest, Assert } from '../lib/test';
import { ButtonF } from './controls/button';
import { runReactTest } from './test_utils';

import * as auth_dialog from './auth_dialog';

class MockAuthFlow {
	options: any;

	constructor(options: any) {
		this.options = options;
	}

	authenticate() {
		return Q({
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
		let receivedCredentials = Q.defer<any>();
		let authServerURL = 'https://acmestorage.com/oauth2/authorize';

		// render the auth dialog
		let dialog = render(AuthDialogF({
			authServerURL,
			onComplete: (credentials: any) => receivedCredentials.resolve(credentials)
		}), element);

		// click on the 'Sign In' button and verify
		// that the auth dialog begins and the dialog text changes
		let buttons = addons.TestUtils.scryRenderedComponentsWithType(dialog, ButtonF.componentClass);
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
