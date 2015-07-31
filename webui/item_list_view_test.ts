import react = require('react');
import react_addons = require('react/addons');

import item_builder = require('../lib/item_builder');
import item_list_view = require('./item_list_view');
import item_icons = require('./item_icons');
import testLib = require('../lib/test');
import ui_test_utils = require('./test_utils');

var reactTestUtils = react_addons.addons.TestUtils;

var testItems = [item_builder.createItem({
	title: 'Apple',
	username: 'jim.smith@gmail.com',
	password: 'abc',
	url: 'https://www.icloud.com'
}), item_builder.createItem({
		title: 'Gmail',
		username: 'jim.smith@gmail.com',
		password: 'def',
		url: 'https://www.gmail.com'
	})];

testLib.addTest('should display store items', (assert) => {
	ui_test_utils.runReactTest((element) => {
		var itemList = react.render(item_list_view.ItemListViewF({
			items: testItems,
			selectedItem: null,
			onSelectedItemChanged: (item, rect) => {
			},
			currentUrl: '',
			iconProvider: new item_icons.FakeIconProvider(),
			focus: false,
			onLockClicked: () => { },
			onMenuClicked: (e) => { }
		}), element);

		var renderedItems = reactTestUtils.scryRenderedComponentsWithType(itemList,
			item_list_view.ItemF.componentClass);
		assert.equal(renderedItems.length, testItems.length);
	});
});

testLib.addTest('should display item details', (assert) => {
	ui_test_utils.runReactTest((element) => {
		var itemSelected = false;
		var iconProvider = new item_icons.FakeIconProvider();

		var renderItem = () => {
			return react.render(item_list_view.ItemF({
				key: 'item',
				item: testItems[0],
				onSelected: () => {
					itemSelected = true;
				},
				isFocused: false,
				iconProvider: iconProvider,
				index: 0,
				offsetTop: 0
			}), element);
		};

		// should render icon with site's primary location
		var itemComponent = renderItem();
		var iconComponent = reactTestUtils.findRenderedComponentWithType(itemComponent,
			item_icons.IconControlF.componentClass);
		assert.equal(iconComponent.props.location, testItems[0].primaryLocation());

		// should invoke onSelected() handler when clicked
		assert.equal(itemSelected, false);
		var rootNode = itemComponent.refs['itemOverview'];
		reactTestUtils.Simulate.click(rootNode);
		assert.equal(itemSelected, true);
	});
});

