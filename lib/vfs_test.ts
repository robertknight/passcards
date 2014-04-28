import Path = require('path');
import testLib = require('./test');
import vfs = require('./vfs');

var createFs = () => {
	return new vfs.FileVFS('/tmp');
}

testLib.addAsyncTest('Read and write file', (assert) => {
	var fs = createFs();
	var fileWritten = fs.write('test-file', 'test-content');
	var contentRead = fileWritten.then(() => {
		return fs.read('test-file');
	});
	contentRead.then((content) => {
		assert.equal(content, 'test-content', 'File contents match');
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('List folder', (assert) => {
	var fs = createFs();
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
});

testLib.runTests();

