#!/usr/bin/env node

// this script signs a Firefox addon using the 'jpm' tool
// as described at https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm#jpm_sign

var fs = require('fs');
var Q = require('q');

var exec = require('./exec');

// read the addon manifest file. The 'version' field
// in the JSON file must match the copy of 'package.json'
// in the generated XPI file at xpiPath below
var addonManifest = require('../addons/firefox/package.json');

var addonName = 'passcards';
var xpiPath = './pkg/passcards@robertknight.github.io.xpi';
var apiKey = process.env['FIREFOX_AMO_KEY'];
var apiSecret = process.env['FIREFOX_AMO_SECRET'];

var jpmBinary = './node_modules/.bin/jpm';

// returns the path where JPM will save the signed version
// of an XPI retrieved from addons.mozilla.org after the
// package is successfully signed
function jpmOutputFilename(packageName, version) {
  return './' + packageName + '-' + version + '-fx.xpi';
}

var rename = Q.denodeify(fs.rename);

// upload and sign the package
exec(jpmBinary, 'sign',
    '--api-key', apiKey,
    '--api-secret', apiSecret,
    '--xpi', xpiPath)
  .then(function (result) {
    var code = result[0];
    var stdout = result[1];
    if (code !== 0) {
      throw new Error('Signing failed with status ' + code + ': ' + stdout);
    }

    // replace the input XPI file with the signed version
    return rename(
      jpmOutputFilename(addonName, addonManifest.version, xpiPath), xpiPath
    );
  }).then(function () {
    console.log('Firefox addon successfully signed');
  })
  .catch(function (err) {
    console.log('Signing failed:', err);
    throw err;
  });

