
import * as Q from 'q';
import { unmountComponentAtNode } from 'react-dom';

export function runReactTest(callback: (element: Element) => void | Q.Promise<void>) {
	var element = window.document.getElementById('app');
	var result = callback(element);
	if (Q.isPromise(result)) {
		return (<Q.Promise<void>>result).then(() => {
			unmountComponentAtNode(element);
		});
	} else {
		unmountComponentAtNode(element);
	}
	return result;
}
