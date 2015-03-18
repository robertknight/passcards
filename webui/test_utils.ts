/// <reference path="../typings/DefinitelyTyped/jsdom/jsdom.d.ts" />

import react = require('react');

export function runReactTest(callback: (element: Element) => void | Q.Promise<void>) {
	var element = window.document.getElementById('app');
	var result = callback(element);
	react.unmountComponentAtNode(element);
	return result;
}

