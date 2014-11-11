#!/usr/bin/env node

var fs = require('fs');
var Q = require('q');

var exec = require('./exec');

// Update the 'version' field in a JSON manifest
// file based on the number of commits since
// the initial commit in the repository.
//
// This emulates SVN-like revision numbers in Git,
// although this only works provided that
// all commits are made from the same branch and
// that the branch head only changes via addition
// of new commits.
//
// This also requires full Git history in the local
// repository. The script will convert the current
// repository from a shallow to full clone if necessary
// before upating the manifest.

function convertToFullRepo() {
	if (fs.existsSync('.git/shallow')) {
		return exec('git', 'fetch', '--unshallow');
	} else {
		return Q();
	}
}

var manifestFile = process.argv[2];
var key = process.argv[3] || 'version';

convertToFullRepo().then(function() {
	return exec('git', 'log', '--format="%h"')
}).then(function(result) {
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
}).done();

