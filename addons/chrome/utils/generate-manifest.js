#!/usr/bin/env node

'use strict';

const fs = require('fs');

const { render } = require('mustache');

const repoVersion = require('../../../utils/repo-version');

const [ browser, inPath, outPath ] = process.argv.slice(2);

repoVersion().then((version) => {
	const template = fs.readFileSync(inPath).toString('utf-8');
	const output = render(template, {
		firefox: browser === 'firefox',
		version,
	});

	fs.writeFileSync(outPath, output);
}).catch((err) => {
	console.error('Failed to generate manifest', err);
});
