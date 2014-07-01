/// <reference path="../typings/firefox-addon-sdk.d.ts" />

var buttons = require('sdk/ui/button/toggle');
var panel = require('sdk/panel');
var tabs = require('sdk/tabs');

// use `self_` to avoid conflict with `self`
// in lib.d.ts
var self_ = require('sdk/self');

var mainPanel;

var showPanel = (state) => {
	mainPanel = panel.Panel({
		width: 300,
		height: 400,
		contentURL : self_.data.url('index.html'),
		onHide: onPanelHidden
	});

	if (state.checked) {
		mainPanel.show({
			position: toolbarButton
		});
	}
};

var toolbarButton = buttons.ToggleButton({
	id: 'key-icon',
	label: 'Password Manager',
	icon: {
		'16' : './icon-16.png',
		'32' : './icon-32.png',
		'64' : './icon-64.png'
	},
	onChange: showPanel
});

function onPanelHidden() {
	toolbarButton.state('window', { checked: false });
};
