'use strict';

const fs = require('fs');
const exec = require('./exec');

/**
 * Convert the local repo to a full checkout.
 *
 * This enables counting the number of commits on the current branch since the
 * initial commit.
 */
function convertToFullRepo() {
	if (fs.existsSync('.git/shallow')) {
		return exec(['git', 'fetch', '--unshallow']);
	} else {
		return Promise.resolve();
	}
}

/**
 * Return a version number for the app based on:
 *
 * - The current version in `package.json`
 * - The length of the Git commit history
 *
 * For this revision number to be monotonically increasing, it must always be
 * used on the same branch (`master`) and commits must never be removed once
 * pushed to that branch.
 */
function repoVersion() {
	return convertToFullRepo().then(function() {
		return exec(['git', 'log', '--format="%h"'])
	}).then(function([status, commitList]) {
		const commits = commitList.trim().split('\n');
		const patchVersion = commits.length;
		const pkg = require('../package.json');
		const baseVersion = pkg.version.split('.');
		baseVersion[2] = patchVersion;
		const newVersion = baseVersion.join('.');

		return newVersion;
	});
}

module.exports = repoVersion;


