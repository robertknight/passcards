import fs = require('fs');
import os = require('os');

import testLib = require('../test');
import http_vfs = require('./http');
import nodefs = require('./node');

var PORT = 3002;

var fsRoot = <string>(<any>os).tmpdir() + '/http-vfs-test';

var fileVfs = new nodefs.FileVFS(fsRoot);
var httpVfsServer = new http_vfs.Server(fileVfs);
var httpVfs = new http_vfs.Client('http://127.0.0.1:' + PORT);

function setup(): Q.Promise<void> {
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
	return httpVfs.list('test-dir').then((files) => {
		assert.equal(files.length, 1);
		return httpVfs.list('test-dir/');
	}).then((files) => {
		assert.equal(files.length, 1);
	});
});

testLib.addAsyncTest('read file', (assert) => {
	return httpVfs.read('test-file').then((content) => {
		assert.equal(content, 'file-content');
	});
});

testLib.addAsyncTest('write file', (assert) => {
	return httpVfs.write('test-file-3', 'file3-content').then(() => {
		assert.equal(fs.readFileSync(fsRoot + '/test-file-3').toString('binary'), 'file3-content');
	});
});

testLib.addAsyncTest('make path', (assert) => {
	return httpVfs.mkpath('test-dir-2/test-dir-3').then(() => {
		assert.ok(fs.statSync(fsRoot + '/test-dir-2/test-dir-3').isDirectory());
	});
});

testLib.addAsyncTest('remove file', (assert) => {
	fs.writeFileSync(fsRoot + '/test-remove-file', 'remove-me');
	return httpVfs.rm('test-remove-file').then(() => {
		assert.ok(!fs.existsSync(fsRoot + '/test-remove-file'));
	});
});

testLib.addAsyncTest('stat file', (assert) => {
	return httpVfs.stat('test-file').then((stat) => {
		assert.equal(stat.isDir, false);
		assert.equal(stat.name, 'test-file');
		return httpVfs.stat('test-dir');
	}).then((stat) => {
		assert.equal(stat.isDir, true);
	});
});

testLib.cancelAutoStart();
setup().then(() => {
	testLib.teardownSuite(() => {
		httpVfsServer.close();
	});
	testLib.start();
}).done();

