#!/usr/bin/env node

// Generates CSS from styles defined using style.create()
// cssgen.js loads each of the modules specified on the command
// line and then compiles all of the styles defined by
// style.create() calls to CSS which is written to stdout.
//
// Usage: cssgen.js [<entry points...>]

var path = require('path');

var style = require('../build/webui/base/style');

for (var i=2; i < process.argv.length; i++) {
	var modulePath = path.resolve(process.argv[i]);
	require(modulePath);
}

var styles = style.registry.styles();
var css = Object.keys(styles).map(function(name) {
	var styleGroup = styles[name];
	return style.compile(styleGroup);
}).join('\n\n');

console.log(css);

