/// <reference path="../typings/firefox-addon-sdk.d.ts" />

var buttons = require('sdk/ui/button/toggle');
var panel = require('sdk/panel');
var tabs = require('sdk/tabs');
var preferences_service = require('sdk/preferences/service');

// use `self_` to avoid conflict with `self`
// in lib.d.ts
var self_ = require('sdk/self');

var mainPanel;
var toolbarButton;
var tabWorkers = {};

function setupTab(tab) {
	tabWorkers[tab.id] = tab.attach({
		contentScriptFile: self_.data.url('scripts/page.js')
	});
}

function notifyPageChanged(tab) {
	if (mainPanel) {
		mainPanel.port.emit('pagechanged', tabs.activeTab.url);
	}
}

function onPanelHidden() {
	toolbarButton.state('window', { checked: false });
};

function main() {
	// disable strict mode in development to suppress a large
	// number of console warnings from normal web pages
	preferences_service.set('javascript.options.strict', false);

	tabs.on('ready', (tab) => {
		setupTab(tab);
		if (tab === tabs.activeTab) {
			notifyPageChanged(tab);
		}
	});

	tabs.on('activate', (tab) => {
		notifyPageChanged(tab);
	});
		
	var showPanel = (state) => {
		if (!mainPanel) {
			mainPanel = panel.Panel({
				width: 400,
				height: 400,
				contentURL : self_.data.url('index.html'),
				contentScriptFile: self_.data.url('scripts/panel_content.js'),
				contentScriptWhen: 'start',
				onHide: onPanelHidden
			});
			mainPanel.port.on('oauth-credentials-received', (hash: string) => {
				mainPanel.contentURL = self_.data.url('index.html') + hash;
			});
			mainPanel.port.on('find-fields', () => {
				var worker = tabWorkers[tabs.activeTab.id];
				worker.port.once('found-fields', (fields) => {
					mainPanel.port.emit('found-fields', fields);
				});
				worker.port.emit('find-fields');
			});
			mainPanel.port.on('autofill', (entries: any[]) => {
				var worker = tabWorkers[tabs.activeTab.id];
				worker.port.emit('autofill', entries);
			});
			mainPanel.port.on('ready', () => {
				notifyPageChanged(tabs.activeTab);
			});

			for (var tab in tabs) {
				if (tab.id) {
					setupTab(tab);
				}
			}
		}

		if (state.checked) {
			mainPanel.show({
				position: toolbarButton
			});
		}
	};

	toolbarButton = buttons.ToggleButton({
		id: 'key-icon',
		label: 'Password Manager',
		icon: {
			'16' : './icon-16.png',
			'32' : './icon-32.png',
			'64' : './icon-64.png'
		},
		onChange: showPanel
	});
}

main();
