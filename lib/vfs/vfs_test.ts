import asyncutil = require('../base/asyncutil');
import nodefs = require('./node');
import testLib = require('../test');
import vfs = require('./vfs');
import vfs_util = require('./util');

class StorageEntry {
	key: string;
	value: any;
}

var createNodeFs = () => {
	let TEST_DIR = `${testLib.tempDir() }/vfs-test`;
	let fs = new nodefs.FileVFS(TEST_DIR);
	return vfs_util.rmrf(fs, '')
	.then(() => {
		return fs.mkpath('');
	}).then(() => {
		return vfs_util.listRecursive(fs, '')
	}).then((files) => {
		if (files.length > 0) {
			throw new Error('Failed to remove all files');
		}
		return fs;
	});
}

function addTests(fsName: string, createFs: () => Promise<vfs.VFS>) {
	testLib.addAsyncTest(fsName + ': Read and write file', (assert) => {
		var fs: vfs.VFS;
		return createFs().then((_fs) => {
			fs = _fs;
			return fs.write('test-file', 'test-content');
		}).then(() => {
			return fs.read('test-file');
		}).then((content) => {
			assert.equal(content, 'test-content', 'File contents match');
		});
	});

	testLib.addAsyncTest(fsName + ': Stat file', (assert) => {
		var fs: vfs.VFS;
		return createFs().then((_fs) => {
			fs = _fs;
			return fs.write('test-stat-file', 'test-content');
		}).then(() => {
			return fs.stat('test-stat-file');
		}).then((info) => {
			testLib.assertEqual(assert, info, {
				name: 'test-stat-file',
				path: 'test-stat-file',
				isDir: false
			}, ['name', 'path', 'isDir']);
		});
	});

	testLib.addAsyncTest(fsName + ': Create dir', (assert) => {
		var fs: vfs.VFS;
		return createFs().then((_fs) => {
			fs = _fs;
			return fs.mkpath('foo/bar');
		}).then(() => {
			return fs.stat('foo/bar');
		}).then((dirInfo) => {
			testLib.assertEqual(assert, dirInfo, {
				name: 'bar',
				path: 'foo/bar',
				isDir: true
			}, ['name', 'path', 'isDir']);
		});
	});

	testLib.addAsyncTest(fsName + ': List folder', (assert) => {
		var fs: vfs.VFS;
		return createFs().then((_fs) => {
			fs = _fs;
			return fs.write('test-list-folder', 'test-content');
		}).then(() => {
			return fs.list('.');
		}).then((fileList) => {
			var found = false;
			fileList.forEach((file) => {
				if (file.name !== 'test-list-folder') {
					return;
				}
				var expectedFile = {
					name: 'test-list-folder',
					path: 'test-list-folder',
					isDir: false
				};
				found = true;
				testLib.assertEqual(assert, file, expectedFile, ['name', 'path', 'isDir']);
			});
			assert.equal(found, true);
		});
	});

	testLib.addAsyncTest(fsName + ': Search folder', (assert) => {
		var fs = createFs();
		return fs.then((fs) => {
			var fileWritten = fs.write('test-search-folder', 'test-content');
			return fileWritten.then(() => {
				fs.search('search-fold', (error, files) => {
					assert.ok(error == null);
					assert.equal(files.length, 1);
					var expectedFile = {
						name: 'test-search-folder',
						path: 'test-search-folder',
						isDir: false
					};
					testLib.assertEqual(assert, files[0], expectedFile, ['name', 'path', 'isDir']);
				});
			});
		});
	});

	testLib.addAsyncTest(fsName + ': Copy dir', (assert) => {
		var fs: vfs.VFS;
		var destFiles: vfs.FileInfo[];

		return createFs().then((_fs) => {
			fs = _fs;
			// create a dir hierarchy in 'src', copy it
			// to 'dest', list both hierarchies and compare
			// the sorted results
			return fs.mkpath('src');
		}).then(() => {
			return fs.write('src/file_a', 'file-a-content');
		}).then(() => {
			return fs.mkpath('src/dir_b')
		}).then(() => {
			return fs.write('src/dir_b/file_c', 'file-c-content');
		}).then(() => {
			return fs.mkpath('src/dir_b/dir_d');
		}).then(() => {
			return fs.write('src/dir_b/dir_d/file_d', 'file-d-content');
		}).then(() => {
			return fs.stat('src');
		}).then((srcFolder) => {
			return vfs_util.cp(fs, srcFolder, 'dest');
		}).then(() => {
			return vfs_util.listRecursive(fs, 'dest');
		}).then((_destFiles) => {
			destFiles = _destFiles;
			return vfs_util.listRecursive(fs, 'src');
		}).then((srcFiles) => {
			srcFiles.sort((a, b) => {
				return a.path.localeCompare(b.path);
			});
			destFiles.sort((a, b) => {
				return a.path.localeCompare(b.path);
			});
			srcFiles.forEach((srcFile) => {
				srcFile.path.replace('src/', 'dest/');
			});
			testLib.assertEqual(assert, srcFiles, destFiles);
		});
	});

	testLib.addAsyncTest(fsName + ': ignore paths above root', (assert) => {
		return createFs().then((fs) => {
			return fs.list('../../');
		}).then((files) => {
			assert.equal(files.length, 0);
		});
	});

	testLib.addAsyncTest(fsName + ': write conflict detection', (assert) => {
		var fs: vfs.VFS;
		return createFs().then((_fs) => {
			fs = _fs;
			return fs.write('test-file-conflict', 'content-v1');
		}).then(() => {
			return fs.stat('test-file-conflict');
		}).then((stat) => {
			// attempt two concurrent updates to the file, one
			// should succeed, the other should fail
			var writeOpts = { parentRevision: stat.revision };
			var attemptA = fs.write('test-file-conflict', 'content-v2-a', writeOpts)
			.then(() => true).catch(() => false);
			var attemptB = fs.write('test-file-conflict', 'content-v2-b-b', writeOpts)
			.then(() => true).catch(() => false);
			return Promise.all([attemptA, attemptB]);
		}).then((ok) => {
			var successCount = ok.reduce((total, ok) => ok ? total + 1 : total, 0);
			assert.equal(successCount, 1);
			return fs.read('test-file-conflict');
		}).then((content) => {
			assert.ok(content == 'content-v2-a' || content == 'content-v2-b-b');
		});
	});

	testLib.addAsyncTest(fsName + ': mkpath', (assert) => {
		var fs: vfs.VFS;
		return createFs().then((_fs) => {
			fs = _fs;
			// create a nested path, this should succeed
			return fs.mkpath('/foo/bar');
		}).then(() => {
			// check that the dir was created
			return fs.stat('/foo/bar');
		}).then((info) => {
			assert.ok(info.isDir);
			// attempt to recreate the directory.
			// This should fail
			return asyncutil.result(fs.mkpath('/foo/bar'));
		}).then((result) => {
			assert.ok(result.error instanceof vfs.VfsError);
		});
	});
}

addTests('Node FS', createNodeFs);

