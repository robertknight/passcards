import react = require('react');
import react_addons = require('react/addons');

import item_icons = require('./item_icons');
import testLib = require('../lib/test');
import ui_test_utils = require('./test_utils');

var reactTestUtils = react_addons.addons.TestUtils;

function findDOMElement<T extends HTMLElement>(component: react.Component<{}, {}>, tagname: string) {
	return <T>react.findDOMNode(reactTestUtils.findRenderedDOMComponentWithTag(component, tagname));
}

testLib.addTest('should display site icon', (assert) => {
	ui_test_utils.runReactTest((element) => {
		var iconProvider = new item_icons.FakeIconProvider();
		var itemLocation = 'https://www.icloud.com';

		var iconComponent = react.render(item_icons.IconControlF({
			location: itemLocation,
			iconProvider: iconProvider,
			isFocused: false,
			onClick: () => { }
		}), element);
		var iconImage = findDOMElement<HTMLImageElement>(iconComponent, 'img');

		var testIconUrl = 'https://www.mysite.com/icon.png';
		iconProvider.addIcon(itemLocation, {
			iconUrl: testIconUrl,
			state: item_icons.IconFetchState.Found,
			width: 48,
			height: 48
		});

		iconComponent = react.render(item_icons.IconControlF({
			location: itemLocation,
			iconProvider: iconProvider,
			isFocused: false,
			onClick: () => { }
		}), element);
		iconImage = findDOMElement<HTMLImageElement>(iconComponent, 'img');
		assert.equal(iconImage.getAttribute('src'), testIconUrl);
	});
});
