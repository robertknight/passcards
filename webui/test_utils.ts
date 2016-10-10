
import { unmountComponentAtNode } from 'react-dom';

export function runReactTest(callback: (element: Element) => void | Promise<void>) {
	var element = window.document.getElementById('app');
	var result = callback(element);
	if (typeof result === 'object') {
		return (<Promise<void>>result).then(() => {
			unmountComponentAtNode(element);
		});
	} else {
		unmountComponentAtNode(element);
	}
	return Promise.resolve(result);
}
