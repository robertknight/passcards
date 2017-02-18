#!/usr/bin/env node

// this script handles signing of browser extensions
// and publishing of generated artefacts to S3 and
// the Chrome Web Store

const Orchestrator = require('orchestrator');

const exec = require('./exec');
const s3Upload = require('./s3-upload');

// wrapper around exec() which rejects the promise
// if the task exits with a non-zero status
function mustExec(...args) {
  return exec(args).then(([status, stdout]) => {
    if (status !== 0) {
      throw new Error(args.join(' ') + ' exited with status '
          + status + ': ' + stdout);
    }
  });
}

const S3_BUCKET = 'io.github.robertknight';

const webVersionString = 'latest';

const orchestrator = new Orchestrator();

orchestrator.add('web-upload', () => {
  return s3Upload.syncDir('webui/', S3_BUCKET, 'passcards/web/' + webVersionString + '/');
});

orchestrator.add('sign-firefox-extension', () => {
  return mustExec('make', 'sign-firefox-extension');
});

orchestrator.add('extension-upload', ['sign-firefox-extension'], () => {
  return s3Upload.syncDir('pkg/', S3_BUCKET, 'passcards/builds/' + webVersionString + '/');
});

orchestrator.add('publish-chrome-extension', () => {
  return mustExec('./utils/publish-chrome-extension.js', 'pkg/passcards.zip');
});

orchestrator.add('publish-passcards-cli', () => {
  return mustExec('make', 'publish-passcards-cli');
});

orchestrator.add('deploy', [
  'web-upload',
  'extension-upload',
  'publish-chrome-extension',
  'publish-passcards-cli',
]);

orchestrator.on('task_err', (e) => {
  console.log('%s failed: %s', e.task, e.err);
});

orchestrator.on('task_stop', (e) => {
  console.log('%s completed', e.task);
});

orchestrator.start('deploy', (err) => {
  if (err) {
    console.error('Deployment failed');
    process.exit(1);
  } else {
    console.log('Deployment successful');
  }
});
