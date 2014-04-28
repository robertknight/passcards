import Path = require('path');
import testLib = require('./test');
import vfs = require('./vfs');
import Q = require('q');

var createFs = () => {
	var TEST_DIR = '/tmp/vfs-test';
	var fs = new vfs.FileVFS(TEST_DIR);
	var result = Q.defer<vfs.FileVFS>();
	vfs.VFSUtil.rmrf(fs, TEST_DIR)
	.then(() => {
		return fs.mkpath(TEST_DIR);
	})
	.then(() => {
		result.resolve(fs);
	})
	.done();

	return result.promise;
}

testLib.addAsyncTest('Read and write file', (assert) => {
	var fs = createFs();
	fs.then((fs) => {
		var fileWritten = fs.write('test-file', 'test-content');
		var contentRead = fileWritten.then(() => {
			return fs.read('test-file');
		});
		contentRead.then((content) => {
			assert.equal(content, 'test-content', 'File contents match');
			testLib.continueTests();
		}).done();
	}).done();
});

testLib.addAsyncTest('Stat file', (assert) => {
	var fs = createFs();
	fs.then((fs) => {
		var fileInfo = fs.write('test-stat-file', 'test-content').then(() => {
			return fs.stat('test-stat-file');
		});
		fileInfo.then((info) => {
			testLib.assertEqual(assert, info, {
				name: 'test-stat-file',
				path: Path.join(fs.root, 'test-stat-file'),
				isDir: false
			});
			testLib.continueTests();
		}).done();
	}).done();
});

testLib.addAsyncTest('Create dir', (assert) => {
	var fs = createFs();
	fs.then((fs) => {
		var dirmade = fs.mkpath('foo/bar');
		var dirInfo = dirmade.then(() => {
			return fs.stat('foo/bar');
		});
		dirInfo.then((info) => {
			testLib.assertEqual(assert, info, {
				name: 'bar',
				path: Path.join(fs.root, 'foo/bar'),
				isDir: true
			});
			testLib.continueTests();
		}).done();
	}).done();
});

testLib.addAsyncTest('List folder', (assert) => {
	var fs = createFs();
	fs.then((fs) => {
		var fileWritten = fs.write('test-list-folder', 'test-content');
		var fileList = fileWritten.then(() => {
			return fs.list('.');
		});

		fileList.then((files) => {
			var found = false;
			files.forEach((file) => {
				if (file.name !== 'test-list-folder') {
					return;
				}
				var expectedFile = {
					name: 'test-list-folder',
					path: Path.join(fs.root, 'test-list-folder'),
					isDir: false
				};
				found = true;
				testLib.assertEqual(assert, file, expectedFile);
			});
			assert.equal(found, true);
			testLib.continueTests();
		}).done();
	}).done();
});

testLib.addAsyncTest('Search folder', (assert) => {
	var fs = createFs();
	fs.then((fs) => {
		var fileWritten = fs.write('test-search-folder', 'test-content');
		fs.search('search-fold', (files) => {
			assert.equal(files.length, 1);
			var expectedFile = {
				name: 'test-search-folder',
				path: Path.join(fs.root, 'test-search-folder'),
				isDir: false
			};
			testLib.assertEqual(assert, files[0], expectedFile);
			testLib.continueTests();
		});
	}).done();
});

testLib.runTests();

