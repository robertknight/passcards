
import Q = require('q');
import react = require('react');

export function runReactTest(callback: (element: Element) => void | Q.Promise<void>) {
	var element = window.document.getElementById('app');
	var result = callback(element);
	if (Q.isPromise(result)) {
		return (<Q.Promise<void>>result).then(() => {
			react.unmountComponentAtNode(element);
		});
	} else {
		react.unmountComponentAtNode(element);
	}
	return result;
}
