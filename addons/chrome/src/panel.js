var backgroundPage = chrome.extension.getBackgroundPage();

// install helper so app can close background
// window after autofill is complete
backgroundPage.hidePanel = function() {
	window.close();
}.bind(this);

// render the app's main view into the popup.
//
// Chrome unloads the popup page when the
// user clicks outside the popup.
//
// To preserve the state of the app when
// the view is hidden, the app's root DOM node
// is moved to the background page. When the
// popup is next shown again, the 'saved' view
// is then transferred into the new popup window.
//
// See also https://code.google.com/p/chromium/issues/detail?id=68194
//
var appView;
if (backgroundPage.savedAppView) {
	document.adoptNode(backgroundPage.savedAppView);
	appView = backgroundPage.savedAppView;
	backgroundPage.savedAppView = undefined;
} else {
	appView = document.createElement('div');
	appView.id = 'app-view';
}

window.addEventListener('unload', function() {
	backgroundPage.document.adoptNode(appView);
	backgroundPage.savedAppView = appView;
});

document.body.appendChild(appView);
backgroundPage.renderApp(appView);

// notify the extension which page we
// are on.
//
// The extension is currently only notified
// when the user interacts with the browser
// popup, which means that the extension does
// not need to know anything about the user's
// browsing activity until they explicitly
// interact with it.
//
chrome.windows.getCurrent(function(window) {
	chrome.tabs.query({active: true, windowId: window.id}, function(tabs) {
		if (tabs.length >= 1) {
			var tab = tabs[0];
			backgroundPage.notifyPageChanged(tab);
		}
	});
});
