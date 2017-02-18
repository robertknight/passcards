#!/usr/bin/env node

'use strict';

// This script generates an update manifest for a WebExtension, using the
// format described at https://developer.mozilla.org/en-US/Add-ons/Updates

const { basename } = require('path');
const { createHash } = require('crypto');
const { readFileSync, writeFileSync } = require('fs');

const glob = require('glob');

// Root URL where extension builds are hosted.
const PKG_URL = 'https://s3.amazonaws.com/io.github.robertknight/passcards/builds/latest';

function findExtensions(pkgDir) {
	return new Promise((resolve, reject) => {
		glob(`${pkgDir}/*.xpi`, (err, files) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(files);
		});
	});
}

function sha256(path) {
	const hash = createHash('sha256');
	hash.update(readFileSync(path));
	return hash.digest('hex');
}

const [,,pkgDir,manifestPath] = process.argv;

if (!pkgDir) {
	console.error('Input package dir not specified');
	process.exit(1);
}

if (!manifestPath) {
	console.error('Output manifest path not specified');
	process.exit(1);
}

console.info(`Generating WebExtension update manifest '${manifestPath}' from '${pkgDir}'`);

findExtensions(pkgDir).then((paths) => {
	let manifest = {
		addons: {},
	};
	for (let path of paths) {
		const filename = basename(path);

		const [_, name, version] = filename.match(/([^-]+)-([^-]+)/);
		const id = `${name}@robertknight.github.io`;

		if (!manifest.addons[id]) {
			manifest.addons[id] = {
				updates: [],
			};
		}
		manifest.addons[id].updates.push({
			version,
			update_hash: `sha256:${sha256(path)}`,
			update_link: `${PKG_URL}/${encodeURIComponent(filename)}`,
		});
	}

	const manifestContent = JSON.stringify(manifest, null, 2);
	writeFileSync(manifestPath, manifestContent);
}).catch((err) => {
	console.error('Failed to generate manifest', err);
	process.exit(1);
});

