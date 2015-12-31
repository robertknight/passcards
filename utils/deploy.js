#!/usr/bin/env node

// this script handles signing of browser extensions
// and publishing of generated artefacts to S3 and
// the Chrome Web Store

var Orchestrator = require('orchestrator');

var exec = require('./exec');
var s3Upload = require('./s3-upload');

// wrapper around exec() which rejects the promise
// if the task exits with a non-zero status
function mustExec() {
  var args = Array.prototype.slice.call(arguments);
  return exec.apply(this, args).then(function (result) {
    var status = result[0];
    var stdout = result[1];

    if (status !== 0) {
      throw new Error(args.join(' ') + ' exited with status '
          + status + ': ' + stdout);
    }
  });
}

var S3_BUCKET = 'io.github.robertknight';

var webVersionString = 'latest';

var orchestrator = new Orchestrator();

orchestrator.add('web-upload', function () {
  return s3Upload.syncDir('webui/', S3_BUCKET, 'passcards/web/' + webVersionString + '/');
});

orchestrator.add('sign-firefox-addon', function () {
  return mustExec('node', './utils/sign-firefox-addon');
});

orchestrator.add('extension-upload', ['sign-firefox-addon'], function () {
  return s3Upload.syncDir('pkg/', S3_BUCKET, 'passcards/builds/' + webVersionString + '/');
});

orchestrator.add('publish-chrome-extension', function () {
  return mustExec('./utils/publish-chrome-extension.js', 'pkg/passcards.zip');
});

orchestrator.add('publish-passcards-cli', function () {
  return mustExec('make', 'publish-passcards-cli');
});

orchestrator.add('deploy', [
  'web-upload',
  'extension-upload',
  'publish-chrome-extension',
  'publish-passcards-cli',
]);

orchestrator.on('task_err', function (e) {
  console.log('%s failed: %s', e.task, e.err);
});

orchestrator.on('task_stop', function (e) {
  console.log('%s completed', e.task);
});

orchestrator.start('deploy', function (err) {
  if (err) {
    console.log('Deployment failed');
    process.exit(1);
  } else {
    console.log('Deployment successful');
  }
});
