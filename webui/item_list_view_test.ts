import react = require('react');
import react_addons = require('react/addons');

import event_stream = require('../lib/base/event_stream');
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

class FakeIconProvider implements item_icons.IconProvider {
	updated: event_stream.EventStream<string>;

	constructor() {
		this.updated = new event_stream.EventStream<string>();
	}

	query(url: string): item_icons.Icon {
		return {
			iconUrl: '',
			state: item_icons.IconFetchState.NoIcon,
			width: 48,
			height: 48
		};
	}

	updateMatches(updateUrl: string, itemUrl: string) {
		return false;
	}
}

testLib.addAsyncTest('should display item properties', (assert) => {
	var element = window.document.getElementById('app');
	var itemSelected = false;
	var renderedItem = react.render(item_list_view.ItemF({
		key: 'item',
		item: testItems[0],
		onSelected: () => {
			itemSelected = true;
		},
		isFocused: false,
		iconProvider: new FakeIconProvider(),
		index: 0,
		offsetTop: 0
	}), element);
	console.log(element.innerHTML);
});

/*
testLib.addAsyncTest('should display store items', (assert) => {
	var element = window.document.getElementById('app');

	var itemList = react.render(item_list_view.ItemListViewF({
		items: testItems,
		selectedItem: null,
		onSelectedItemChanged: (item, rect) => {
		},
		currentUrl: '',
		iconProvider: new FakeIconProvider(),
		focus: false,
		onLockClicked: () => { },
		onMenuClicked: (e) => { }
	}), element);

	var renderedItems = reactTestUtils.scryRenderedComponentsWithType(itemList, item_list_view.Item);
	assert.equal(renderedItems.length, testItems.length);
});
*/
