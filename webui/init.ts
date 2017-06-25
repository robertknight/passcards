import app = require('./app');
import env = require('../lib/base/env');
import { setClipboardDocument } from './base/clipboard';

interface AppWindow extends Window {
    setClipboardDocument(doc: Document): void;
    renderApp(element: HTMLElement): void;
}

document.addEventListener('DOMContentLoaded', () => {
    // redirect to a secure connection unless this copy of the app
    // is being hosted locally
    var location = document.location.href;
    if (
        location.indexOf('http:') == 0 &&
        location.indexOf('http://localhost') == -1
    ) {
        document.location.href = location.replace('http:', 'https:');
        return;
    }

    var theApp = new app.App();
    if (!env.isChromeExtension()) {
        theApp.renderInto(document.getElementById('app-view'));
    }

    var appWindow = <AppWindow>window;
    appWindow.renderApp = element => {
        theApp.renderInto(element);
    };

    appWindow.setClipboardDocument = (doc: Document) => {
        setClipboardDocument(doc);
    };
});
