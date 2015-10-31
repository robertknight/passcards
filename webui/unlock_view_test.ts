import * as react from 'react';
import { addons } from 'react/addons';
import * as Q from 'q';

import assign = require('../lib/base/assign');
import { EventStream } from '../lib/base/event_stream';
import { UnlockViewF, Store } from './unlock_view';
import { runReactTest } from './test_utils';

import { addTest } from '../lib/test';

let {TestUtils } = addons;

let defaultFakeStore: Store = {
	onKeysUpdated: new EventStream<Object[]>(),
	unlock(password: string) {
		return Q<void>(null);
	},
	passwordHint() {
		return Q('');
	},
	listKeys() {
		return Q([]);
	}
};

addTest('should disable password field until keys have been synced',
	assert => {
		let fakeStore = assign<Store>({}, defaultFakeStore);

		return runReactTest(element => {
			// render view with no keys saved, the password field should
			// initially be disabled
			let view = react.render(UnlockViewF({
				store: fakeStore,
				isLocked: true,
				onUnlock: () => { },
				onUnlockErr: () => { },
				onMenuClicked: () => { },
				focus: false,
			}), element);
			let passwordInput = TestUtils.findRenderedDOMComponentWithTag(view, 'input');

			return Q('').then(() => {
				assert.ok(passwordInput.props.disabled);
				
				// simulate key being saved
				fakeStore.onKeysUpdated.publish([null]);
				assert.ok(!passwordInput.props.disabled);
			});
		});
	});

addTest('should enable password field when keys have already been synced',
	assert => {
		let fakeStore = assign<Store>({}, defaultFakeStore, {
			listKeys: () => {
				return Q([null]);
			}
		});
		return runReactTest(element => {
			let view = react.render(UnlockViewF({
				store: fakeStore,
				isLocked: true,
				onUnlock: () => { },
				onUnlockErr: () => { },
				onMenuClicked: () => { },
				focus: false,
			}), element);
			let passwordInput = TestUtils.findRenderedDOMComponentWithTag(view, 'input');
			return Q('').then(() => {
				assert.ok(!passwordInput.props.disabled);
			});
		});
	});
