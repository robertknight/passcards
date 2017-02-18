#!/usr/bin/env node

const repoVersion = require('./repo-version');
const { writeFileSync } = require('fs');

repoVersion().then((version) => {
	const pkg = require('../package.json');
	pkg.version = version;
	writeFileSync('package.json', JSON.stringify(pkg, null /* replacer */, 2) + '\n')
}).catch((err) => {
	console.error('Failed to update package.json', err);
});

