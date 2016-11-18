#!/usr/bin/env node

'use strict';

const fs = require('fs');

const { render } = require('mustache');

const [ browser, inPath, outPath ] = process.argv.slice(2);

const template = fs.readFileSync(inPath).toString('utf-8');
const output = render(template, {
	firefox: browser === 'firefox',
});

fs.writeFileSync(outPath, output);

