#!/usr/bin/env node

var fs = require('fs');
var INDENT = 2;

for (var i=2; i < process.argv.length; i++) {
	var jsonFilePath = process.argv[i];
	var content = JSON.parse(fs.readFileSync(jsonFilePath));
	fs.writeFileSync(jsonFilePath, JSON.stringify(content, null /* replacer */, INDENT) + '\n');
}
