#!/usr/bin/env node

var findit = require('findit');
var fs = require('fs');
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

function fixupResult(source) {
	// Fix up incorrect formatting of function call arguments
	// that start with open parens:
	//
	//   'foo(a, b,() => {' => 'foo(a, b, () =>'
	// 
	// Fixed upstream in TypeScript by 929d359bdfb880339845cb88df0bb959a89a9220
	// (should land in TS 1.5)
	var result = source.replace(/,\((.* => {)/g,', ($1');

	// Remove extra indent on new lines that continue
	// a previous line
	//
	// 'foo()
	//  \t.then(result => {' =>
	//
	// 'foo()
	//  .then(result => {'
	//
	result = result.replace(/(\s+)\t\./g,'$1.');
	return result;
}

findTypeScriptFiles('.').then(function(files) {
	console.log('found %d files to process', files.length);
	typescript_formatter.processFiles(files, {
		replace: false,
		tsfmt: true,
		editorconfig: false,
		tslint: false,
		verbose: false,
		dryRun: true // prevent echoing of output to console
	}).then(function(results) {
		Object.keys(results).forEach(function(fileName) {
			var result = results[fileName];
			var fixedUpResult = fixupResult(result.dest);
			if (result.src !== fixedUpResult) {
				console.log('Updated', fileName);
				fs.writeFileSync(fileName, fixedUpResult);
			}
		});
		console.log('Formatting complete');
	}).catch(function(err) {
		console.error('Processing failed: %s', err.toString());
	});
}).catch(function(err) {
	console.error('Failed to find TypeScript files: %s', err.toString());
});
