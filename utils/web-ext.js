#!/usr/bin/env node

'use strict';

// Wrapper around web-ext which works around incorrect output status when the
// command fails
//
// See https://github.com/mozilla/web-ext/issues/585

const exec = require('./exec');

exec('./node_modules/.bin/web-ext', ...process.argv.slice(2))
	.then(([status, stdout, stderr]) => {
		if (stdout.indexOf('FAIL') !== -1) {
			process.exit(1);
		}
	})
	.catch(err => {
		console.error('Failed to run web-ext');
	});
