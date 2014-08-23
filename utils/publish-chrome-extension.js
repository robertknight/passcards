#!/usr/bin/env node

var APP_ID = 'olcdnhbhbfgncnocdfojpdjbododkimk';
var PKG_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/' + APP_ID;
var PKG_PUBLISH_ENDPOINT = 'https://www.googleapis.com/chromewebstore/v1.1/items/' + APP_ID + '/publish';
var PKG_PATH = 'pkg/passcards.zip';

var fs = require('fs');
var request = require('request');
var sprintf = require('sprintf');

function requireEnvVar(name) {
	var val = process.env[name];
	if (typeof val !== 'string') {
		throw new Error(sprintf('Required environment variable %s is not set', name));
	}
	return val;
}

function main() {
	var travisBranch = requireEnvVar('TRAVIS_BRANCH');
	var travisPullRequest = requireEnvVar('TRAVIS_PULL_REQUEST');

	if (travisBranch !== 'master' || travisPullRequest !== 'false') {
		console.log('Skipping publication from pull request or non-master branch');
		return;
	}

	var client_secret = requireEnvVar('CHROME_EXT_CLIENT_SECRET');
	var refresh_token = requireEnvVar('CHROME_EXT_REFRESH_TOKEN');

	var accessTokenParams = {
		client_id: '663008561130-bgbo9tvbnr7j1ufrfuf52r4k3g8t9j9n.apps.googleusercontent.com',
		client_secret: client_secret,
		grant_type: 'refresh_token',
		refresh_token: refresh_token
	};

	console.log('Refreshing Chrome Web Store access token...');
	request.post('https://accounts.google.com/o/oauth2/token',
				 {form : accessTokenParams},
				 function(err, response, body) {
		if (err || response.statusCode !== 200) {
			throw new Error(sprintf('Fetching Chrome Web Store access token failed: %d %s', response.statusCode, body));
		}

		console.log('Uploading updated package', PKG_PATH);
		var accessTokenParams = JSON.parse(body);
		fs.createReadStream(PKG_PATH).pipe(request.put(PKG_UPLOAD_ENDPOINT, {
			auth: { bearer: accessTokenParams.access_token }
		}, function(err, response, body) {
			if (err || response.statusCode !== 200) {
				throw new Error(sprintf('Package upload failed: %d %s', response.statusCode, body));
			}

			console.log('Publishing updated package', APP_ID);
			request.post(PKG_PUBLISH_ENDPOINT,{
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
};
process.on('uncaughtException', onErr);

try {
	main()
} catch (err) {
	onErr(err);
}

