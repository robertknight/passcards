import { render } from 'react-dom';
import { findRenderedDOMComponentWithTag } from 'react-dom/test-utils';

import assign = require('../lib/base/assign');
import { EventStream } from '../lib/base/event_stream';
import { UnlockViewF, Store } from './unlock_view';
import { runReactTest } from './test_utils';

import { addTest } from '../lib/test';

let defaultFakeStore: Store = {
    onKeysUpdated: new EventStream<Object[]>(),
    unlock(password: string) {
        return Promise.resolve<void>(null);
    },
    passwordHint() {
        return Promise.resolve('');
    },
    listKeys() {
        return Promise.resolve([]);
    },
};

addTest('should disable password field until keys have been synced', assert => {
    let fakeStore = assign<Store>({}, defaultFakeStore);

    return runReactTest(element => {
        // render view with no keys saved, the password field should
        // initially be disabled
        let view = render(
            UnlockViewF({
                store: fakeStore,
                isLocked: true,
                onUnlock: () => {},
                onUnlockErr: () => {},
                onMenuClicked: () => {},
                focus: false,
            }),
            element
        );
        let passwordInput = findRenderedDOMComponentWithTag(
            view as any,
            'input'
        ) as HTMLInputElement;

        return Promise.resolve('').then(() => {
            assert.ok(passwordInput.disabled);

            // simulate key being saved
            fakeStore.onKeysUpdated.publish([null]);
            assert.ok(!passwordInput.disabled);
        });
    });
});

addTest(
    'should enable password field when keys have already been synced',
    assert => {
        let fakeStore = assign<Store>({}, defaultFakeStore, {
            listKeys: () => {
                return Promise.resolve([null]);
            },
        });
        return runReactTest(element => {
            let view = render(
                UnlockViewF({
                    store: fakeStore,
                    isLocked: true,
                    onUnlock: () => {},
                    onUnlockErr: () => {},
                    onMenuClicked: () => {},
                    focus: false,
                }),
                element
            );
            let passwordInput = findRenderedDOMComponentWithTag(
                view as any,
                'input'
            ) as HTMLInputElement;
            return Promise.resolve('').then(() => {
                assert.ok(!passwordInput.disabled);
            });
        });
    }
);
