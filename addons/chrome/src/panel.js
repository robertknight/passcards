var page = chrome.extension.getBackgroundPage();
page.renderApp(document.getElementById('app-view'));

chrome.tabs.query({active: true}, function(tabs) {
	if (tabs.length >= 1) {
		var tab = tabs[0];
		page.notifyPageChanged(tab);
	}
});
