#!/usr/bin/env node

var child_process = require('child_process');
var path = require('path');

var find = require('./find');
var vm = require('vm');

function findTestFiles(dir) {
	// find all of the tests for the core libraries and CLI
	return find(dir, {
		ignoredDirs: ['.git', 'node_modules', 'typings', 'extensions', 'webui'],
		filter: function(file, stat) {
			return file.match(/_test.js$/);
		}
	}).then(function(files) {
		// add entry point for web UI tests
		return files.concat('build/webui/ui_tests.js');
	});
}

var failed = [];
findTestFiles('./build').then(function(files) {
	var activeJobs = 0;
	var runNext = function() {
		if (files.length === 0) {
			if (activeJobs === 0) {
				if (failed.length === 0) {
					process.exit(0);
				} else {
					console.error('Tests failed: %s', failed.join(', '));
					process.exit(1);
				}
			}
			return;
		}
		var test = files.shift();
		var chan = child_process.fork(path.resolve(test));
		++activeJobs;

		chan.on('exit', function(code, signal) {
			if (code !== 0) {
				failed.push(test);
			}
			--activeJobs;
			runNext();
		});
		chan.disconnect();
	};

	var maxJobs = 5;
	while (activeJobs < maxJobs) {
		runNext();
	}

}).catch(function(err) {
	console.log('test error: ', err.toString());
	process.exit(1);
});
