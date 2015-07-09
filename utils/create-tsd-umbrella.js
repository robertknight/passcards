#!/usr/bin/env node

// Usage: create-tsd-umbrella.js <input dir> <output umbrella file>
//
// Generates a TypeScript umbrella type definitions file
// which references all of the type definitions from
// a local repository of type definitions installed via 'tsd'.
//
// eg. Given:
//
//   typings/DefinitelyTyped/react/react.d.ts
//   typings/DefinitelyTyped/someothermodule/someothermodule.d.ts
//   ...
//
// create-tsd-umbrella.js typings/DefinitelyTyped typings/tsd.d.ts
// Will generate 'tsd.d.ts' with:
//
//    <reference path="DefinitelyTyped/react/react.d.ts" />
//    <reference path="DefinitelyTyped/someothermodule/someothermodule.d.ts" />
//    ...
//   
var fs = require('fs')
var path = require('path')

typingsDir = path.resolve(process.argv[2]);
outputFile = path.resolve(process.argv[3]);

fs.readdir(typingsDir, function(err, files) {
	if (err) {
		console.error("Failed to list dir %s", err);
		return;
	}

	var outputDir = path.dirname(outputFile);
	var referenceLines = [];
	files.forEach(function(file) {
		var typingsFile = typingsDir + "/" + file + "/" + file + ".d.ts";
		var referenceLine = "<reference path=\"" + path.relative(outputDir, typingsFile) + "\" />";
		referenceLines.push(referenceLine);
	});
	referenceLines.sort();

	var referenceContent = referenceLines.join("\n");
	fs.writeFileSync(outputFile, referenceContent);
});
