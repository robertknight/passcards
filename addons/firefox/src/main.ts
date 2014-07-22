/// <reference path="../typings/firefox-addon-sdk.d.ts" />

import buttons = require('sdk/ui/button/toggle');
import hotkeys = require('sdk/hotkeys');
import panel = require('sdk/panel');
import preferences_service = require('sdk/preferences/service');
import self_ = require('sdk/self');
import tabs = require('sdk/tabs');

import rpc = require('./rpc');

interface PageWorker extends ContentWorker {
	rpc?: rpc.RpcHandler;
}

var mainPanel: panel.Panel;
var toolbarButton: buttons.ToggleButton;
var tabWorkers: {[index: string]: PageWorker} = {};

function getTabWorker(tab: Tab) {
	if (!tabWorkers[tab.id]) {
		var worker : PageWorker = tab.attach({
			contentScriptFile: self_.data.url('scripts/page.js')
		});
		worker.rpc = new rpc.RpcHandler(worker.port);
		worker.on('detach', () => {
			delete tabWorkers[tab.id];
		});
		tabWorkers[tab.id] = worker;
	}
	return tabWorkers[tab.id];
}

function notifyPageChanged(tab: Tab) {
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

	// read internal settings
	var PREF_ROOT = 'extensions.' + self_.id + '.';
	var syncService = preferences_service.get(PREF_ROOT + '.syncService', 'dropbox');

	tabs.on('ready', (tab) => {
		if (tab === tabs.activeTab) {
			notifyPageChanged(tab);
		}
	});

	tabs.on('activate', (tab) => {
		notifyPageChanged(tab);
	});

	var showPanel = (state: ButtonState) => {
		if (!mainPanel) {
			mainPanel = panel.Panel({
				width: 400,
				height: 400,
				contentURL : self_.data.url('index.html'),
				contentScriptFile: self_.data.url('scripts/panel_content.js'),
				contentScriptWhen: 'start',
				contentScriptOptions: {
					syncService: syncService
				},
				onHide: onPanelHidden
			});
			
			var panelRpc = new rpc.RpcHandler(mainPanel.port);

			mainPanel.port.on('oauth-credentials-received', (hash: string) => {
				mainPanel.contentURL = self_.data.url('index.html') + hash;
			});

			panelRpc.onAsync('find-fields', (done) => {
				getTabWorker(tabs.activeTab).rpc.call('find-fields', [], (err, fields) => {
					done(err, fields);
				});
			});

			panelRpc.onAsync('autofill', (done: (err: any, result: number) => void, entries: any[]) => {
				getTabWorker(tabs.activeTab).rpc.call('autofill', [entries], (err: any, count: number) => {
					done(err, count);
				});
			});

			mainPanel.port.on('ready', () => {
				notifyPageChanged(tabs.activeTab);
				mainPanel.port.emit('show');
			});
		}

		if (state.checked) {
			mainPanel.show({
				position: toolbarButton
			});
			mainPanel.port.emit('show');
		}
	};

	toolbarButton = buttons.ToggleButton({
		id: 'onepassweb-icon',
		label: 'Password Manager',
		icon: {
			'32' : './icon-32.png',
			'64' : './icon-64.png'
		},
		onChange: showPanel
	});

	var hotkey = hotkeys.Hotkey({
		combo: 'alt-shift-p',
		onPress: () => {
			toolbarButton.click();
		}
	});
}

main();
