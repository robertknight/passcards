#!/usr/bin/env node

var findit = require('findit');
var path = require('path');
var Q = require('q');
var typescript_formatter = require('typescript-formatter');

global.Promise = Q.Promise;

function findTypeScriptFiles(dir) {
	var files = Q.defer();
	var fileList = [];

	var finder = findit(dir);
	var ignoredDirs = ['.git', 'node_modules', 'typings'];

	finder.on('directory', function(dir, stat, stop) {
		if (ignoredDirs.indexOf(path.basename(dir)) !== -1) {
			stop();
		}
	});

	finder.on('file', function(file, stat) {
		if (path.extname(file) === '.ts') {
			fileList.push(file);
		}
	});

	finder.on('end', function() {
		files.resolve(fileList);
	});

	return files.promise;
}

findTypeScriptFiles('.').then(function(files) {
	console.log('found %d files to process', files.length);
	typescript_formatter.processFiles(files, {
		replace: true,
		tsfmt: true,
		editorconfig: false,
		tslint: false,
		verbose: true
	}).then(function(results) {
		console.log('Formatting complete');
	}).catch(function(err) {
		console.error('Processing failed: %s', err.toString());
	});
}).catch(function(err) {
	console.error('Failed to find TypeScript files: %s', err.toString());
});
