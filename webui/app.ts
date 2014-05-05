/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import $ = require('jquery');
import dropboxvfs = require('../lib/dropboxvfs');

export class App {
	constructor() {
		console.log('Hello world from the app');
		var fs = new dropboxvfs.DropboxVFS();
		fs.login();
	}
}

