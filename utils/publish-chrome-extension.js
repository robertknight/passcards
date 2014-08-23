#!/usr/bin/env node

// Utility script to publish a build of the Google Chrome extension
// from pkg/passcards.zip to the Chrome Web Store
//
// This uses the APIs described at https://developer.chrome.com/webstore/using_webstore_api
// to upload a new .zip archive containing the extension's files to the Chrome Web Store
// and then publish the new version.
//
// This script is intended for use from within a Travis CI environment and by default
// exits if not building a non-pull request on the master branch.
//
// Access to the web store APIs requires an access token as described at
// https://developer.chrome.com/webstore/using_webstore_api . To obtain an access
// token this script needs:
//
//  - A client ID, currently hardcoded
//  - A client secret, exposed via the CHROME_EXT_CLIENT_SECRET env var
//  - A client refresh token, exposed via the CHROME_EXT_REFRESH_TOKEN env var

function requireEnvVar(name) {
	var val = process.env[name];
	if (typeof val !== 'string') {
		throw new Error(sprintf('Required environment variable %s is not set', name));
	}
	return val;
}

var fs = require('fs');
var request = require('request');
var sprintf = require('sprintf');

function main(args) {
	var travisBranch = requireEnvVar('TRAVIS_BRANCH');
	var travisPullRequest = requireEnvVar('TRAVIS_PULL_REQUEST');

	var appId = requireEnvVar('CHROME_EXT_APP_ID');
	var packageUploadEndpoint = 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/' + appId;
	var packagePublishEndpoint = 'https://www.googleapis.com/chromewebstore/v1.1/items/' + appId + '/publish';
	var packagePath = args[0];
	if (!packagePath) {
		throw new Error('Package path not specified');
	}

	var clientId = requireEnvVar('CHROME_EXT_CLIENT_ID');
	var clientSecret = requireEnvVar('CHROME_EXT_CLIENT_SECRET');
	var refreshToken = requireEnvVar('CHROME_EXT_REFRESH_TOKEN');

	console.log('app ID', appId);
	console.log('client ID', clientId);
	console.log('client Secret', clientSecret.length);
	console.log('refresh token', refreshToken.length);

	if (travisBranch !== 'master' || travisPullRequest !== 'false') {
		console.log('Skipping publication from pull request or non-master branch');
		return;
	}

	var accessTokenParams = {
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'refresh_token',
		refresh_token: refreshToken
	};

	console.log('Refreshing Chrome Web Store access token...');
	request.post('https://accounts.google.com/o/oauth2/token',
				 {form : accessTokenParams},
				 function(err, response, body) {
		if (err || response.statusCode !== 200) {
			throw new Error(sprintf('Fetching Chrome Web Store access token failed: %d %s', response.statusCode, body));
		}

		console.log('Uploading updated package', packagePath);
		var accessTokenParams = JSON.parse(body);
		fs.createReadStream(packagePath).pipe(request.put(packageUploadEndpoint, {
			auth: { bearer: accessTokenParams.access_token }
		}, function(err, response, body) {
			if (err || response.statusCode !== 200) {
				throw new Error(sprintf('Package upload failed: %d %s', response.statusCode, body));
			}

			console.log('Publishing updated package', appId);
			request.post(packagePublishEndpoint,{
				auth: { bearer: accessTokenParams.access_token },
				form: {}
			}, function(err, response, body) {
				if (err || response.statusCode !== 200) {
					throw new Error(sprintf('Publishing updated package failed: %d %s', response.statusCode, body));
				}

				console.log('Updated package has been queued for publishing');
			});
		}));
	});
}

var onErr = function(err) {
	console.log('Publishing to Chrome Web Store failed:', err.message);
	process.exit(1);
};
process.on('uncaughtException', onErr);

try {
	main(process.argv.slice(2));
} catch (err) {
	onErr(err);
}

