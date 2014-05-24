import fs = require('fs');
import os = require('os');

import testLib = require('./test');
import http_client = require('./http_client');
import http_vfs = require('./http_vfs');
import http_vfs_server = require('./http_vfs_server');
import nodefs = require('./nodefs');

var PORT = 3002;

var fsRoot = <string>(<any>os).tmpdir() + '/http-vfs-test';

var fileVfs = new nodefs.FileVFS(fsRoot);
var httpVfsServer = new http_vfs_server.HttpVFSServer(fileVfs);
var httpVfs = new http_vfs.HttpVFS(new http_client.HttpClient('127.0.0.1', PORT));

function setup() : Q.Promise<void> {
	return fileVfs.mkpath('.').then(() => {
		return fileVfs.mkpath('test-dir');
	}).then(() => {
		return fileVfs.write('test-file', 'file-content');
	}).then(() => {
		return fileVfs.write('test-dir/test-file-2', 'file2-content');
	}).then(() => {
		return httpVfsServer.listen(PORT);
	});
}

testLib.addAsyncTest('list dir', (assert) => {
	httpVfs.list('test-dir').then((files) => {
		assert.equal(files.length, 1);
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('read file', (assert) => {
	httpVfs.read('test-file').then((content) => {
		assert.equal(content, 'file-content');
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('write file', (assert) => {
	httpVfs.write('test-file-3', 'file3-content').then(() => {
		assert.equal(fs.readFileSync(fsRoot + '/test-file-3').toString('binary'), 'file3-content');
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('make path', (assert) => {
	httpVfs.mkpath('test-dir-2/test-dir-3').then(() => {
		assert.ok(fs.statSync(fsRoot + '/test-dir-2/test-dir-3').isDirectory());
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('remove file', (assert) => {
	fs.writeFileSync(fsRoot + '/test-remove-file', 'remove-me');
	httpVfs.rm('test-remove-file').then(() => {
		assert.ok(!fs.existsSync(fsRoot + '/test-remove-file'));
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('stat file', (assert) => {
	httpVfs.stat('test-file').then((stat) => {
		assert.equal(stat.isDir, false);
		assert.equal(stat.name, 'test-file');
		return httpVfs.stat('test-dir');
	}).then((stat) => {
		assert.equal(stat.isDir, true);
		testLib.continueTests();
	}).done();
});

setup().then(() => {
	testLib.teardownSuite(() => {
		httpVfsServer.close();
	});
	testLib.runTests();
});

