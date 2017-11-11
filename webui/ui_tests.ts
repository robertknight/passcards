// this module is the entry point for UI tests
//
// It sets up a fake DOM environment before loading
// any test modules because React performs various
// tests of the environment when it is first required,
// so the fake DOM needs to be set up first.

import { JSDOM } from 'jsdom';

import testLib = require('../lib/test');
import { defer } from '../lib/base/promise_util';

// setup the fake DOM environment for tests.
// This function must be called _before_ React
// is required
function setupDOM(): Promise<Window> {
    if (typeof window !== 'undefined') {
        return Promise.resolve(window);
    }

    var fakeWindow = defer<Window>();
    var dom = new JSDOM(`<div id="app"></div>`, {
        url: 'https://robertknight.github.io/passcards',
    });

    // expose document and window on app globals
    // for use by tests
    var global_: any = global;
    global_.window = dom.window;
    global_.document = dom.window.document;
    global_.navigator = dom.window.navigator;

    fakeWindow.resolve(dom.window);

    return fakeWindow.promise;
}

let testModules = [
    './base/transition_container_test',
    './auth_dialog_test',
    './auth_test',
    './item_field_test',
    './item_icons_test',
    './item_list_view_test',
    './page_test',
    './unlock_view_test',
];

// defer autostart until test modules have been required
testLib.cancelAutoStart();

setupDOM().then(() => {
    testModules.forEach(testModule => {
        try {
            require(testModule);
        } catch (err) {
            console.error('Failed to load test module %s: ', testModule);
            console.error(err.stack);
        }
    });
    testLib.start();
}).catch(err => {
    console.error('UI test setup failed', err);
    throw err;
});
