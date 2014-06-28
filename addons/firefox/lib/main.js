var buttons = require('sdk/ui/button/action');
var panel = require('sdk/panel');
var tabs = require('sdk/tabs');
var self = require('sdk/self');

let mainPanel = panel.Panel({
	width: 250,
	height: 250,
	contentScriptFile : self.data.url('webui_bundle.js'),
	contentURL : self.data.url('panel.html')
});

var showPanel = (state) => {
	mainPanel.show();
};

var button = buttons.ActionButton({
	id: 'key-icon',
	label: 'Password Manager',
	icon: {
		'16' : './icon-16.png',
		'32' : './icon-32.png',
		'64' : './icon-64.png'
	},
	onClick: showPanel
});

