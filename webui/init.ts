import $ = require('jquery');
import app = require('./app');

$(document).ready(() => {
	// redirect to a secure connection unless this copy of the app
	// is being hosted locally
	var location = document.location.href;
	if (location.indexOf('http:') == 0 && location.indexOf('http://localhost') == -1) {
		document.location.href = location.replace('http:', 'https:');
		return;
	}

	new app.App();
});

