#!/usr/bin/env node

// Creates a browserify bundle which includes all external
// modules required by a given script.
//
// Usage: create-external-modules-bundle.js app.js > platform_bundle.js
//

var browserify = require('browserify');
var fs = require('fs');
var module_deps = require('module-deps');
var path = require('path');
var through = require('through2');
var sprintf = require('sprintf');
var sort_stream = require('sort-stream');

var entryFile = path.resolve(process.argv[2]);

var output = process.stdout;

function isExternalModule(id) {
	return id.indexOf('./') !== 0 && id.indexOf('../') !== 0;
}

var depStream = module_deps({
	filter: function(id) {
		return !isExternalModule(id);
	}
});

var bundle = browserify();

var uniqueDeps = [];
depStream.pipe(through.obj(function(row, enc, next) {
	// find unique external module IDs required by the app
	var self = this;
	Object.keys(row.deps).forEach(function(id) {
		if (!isExternalModule(id)) {
			return;
		}
		if (uniqueDeps.indexOf(id) !== -1) {
			return;
		}
		uniqueDeps.push(id);
		self.push(id);
	});
	next();
})).pipe(sort_stream(function(a, b) {
	// sort unique module IDs. This isn't particularly
	// important when building the bundle but is useful if logging
	// the output
	return a.localeCompare(b);
})).pipe(through(function(id, enc, next) {
	// add unique external dependencies to bundle
	bundle.require(id.toString());
	next();
}, function(next) {
	// generate the browserify bundle
	bundle.bundle().pipe(process.stdout);
	next();
}));

// add entry points to bundle
depStream.end(entryFile);


