#!/usr/bin/env node

var child_process = require('child_process');
var fs = require('fs');
var Q = require('q');

function exec() {
	var result = Q.defer();
	var proc = child_process.spawn(arguments[0], Array.prototype.slice.call(arguments,1));
	var stdout = '';
	proc.stdout.on('data', function(data) {
		stdout += data.toString();
	});
	proc.on('close', function(status) {
		result.resolve([status, stdout]);
	});
	return result.promise;
}

var manifestFile = process.argv[2];
var key = process.argv[3] || 'version';

exec('git', 'log', '--format="%h"').then(function(result) {
	var status = result[0];
	var commitList = result[1];

	var commits = commitList.trim().split('\n');
	var patchVersion = commits.length;

	var manifest = JSON.parse(fs.readFileSync(manifestFile));
	var baseVersion = manifest.version.split('.');
	baseVersion[2] = patchVersion;
	var newVersion = baseVersion.join('.');

	manifest.version = newVersion;
	fs.writeFileSync(manifestFile, JSON.stringify(manifest, null /* replacer */, 2) + '\n')
});

