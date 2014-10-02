import Q = require('q');

import testLib = require('../test');

import localstoragefs = require('./localstorage');
import nodefs = require('./node');
import vfs = require('./vfs');

class StorageEntry {
	key: string;
	value: any;
}

class FakeLocalStorage {
	private data : StorageEntry[];

	length: number;

	// from MSStorageExtensions interface
	remainingSpace: number;

	constructor() {
		this.clear();
	}

	getItem(key: string) : any {
		for (var i=0; i < this.data.length; i++) {
			if (this.data[i].key == key) {
				return this.data[i].value;
			}
		}
	}

	setItem(key: string, data: any) : void {
		for (var i=0; i < this.data.length; i++) {
			if (this.data[i].key == key) {
				this.data[i].value = data;
				return;
			}
		}
		this.data.push({key: key, value: data});
		this.length = this.data.length;
	}

	clear() : void {
		this.data = [];
		this.length = 0;
		this.remainingSpace = 0;
	}

	removeItem(key: string) : void {
		this.setItem(key, undefined);
	}

	key(index: number) : string {
		return this.data[index].key;
	}

    [key: string]: any;
    [index: number]: any;
}

var createNodeFs = () => {
	var TEST_DIR = '/tmp/vfs-test';
	var fs = new nodefs.FileVFS(TEST_DIR);
	return vfs.VFSUtil.rmrf(fs, '')
	.then(() => {
		return fs.mkpath(TEST_DIR);
	}).then(() => {
		return vfs.VFSUtil.listRecursive(fs, '')
	}).then((files) => {
		if (files.length > 0) {
			throw new Error('Failed to remove all files');
		}
		return fs;
	});
}

var createLocalStorageFs = () => {
	return Q(new localstoragefs.FS('/1pass-web-test', new FakeLocalStorage));
}

function addTests(fsName: string, createFs: () => Q.Promise<vfs.VFS>) {
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
		fs.then((fs) => {
			var fileWritten = fs.write('test-search-folder', 'test-content');
			fileWritten.then(() => {
				fs.search('search-fold', (files) => {
					assert.equal(files.length, 1);
					var expectedFile = {
						name: 'test-search-folder',
						path: 'test-search-folder',
						isDir: false
					};
					testLib.assertEqual(assert, files[0], expectedFile, ['name', 'path', 'isDir']);
					testLib.continueTests();
				});
			}).done();
		}).done();
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
			return vfs.VFSUtil.cp(fs, srcFolder, 'dest');
		}).then(() => {
			return vfs.VFSUtil.listRecursive(fs, 'dest');
		}).then((_destFiles) => {
			destFiles = _destFiles;
			return vfs.VFSUtil.listRecursive(fs, 'src');
		}).then((srcFiles) => {
			srcFiles.sort((a,b) => {
				return a.path.localeCompare(b.path);
			});
			destFiles.sort((a,b) => {
				return a.path.localeCompare(b.path);
			});
			srcFiles.forEach((srcFile) => {
				srcFile.path.replace('src/','dest/');
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
			var attemptA = fs.write('test-file-conflict', 'content-v2-a', writeOpts);
			var attemptB = fs.write('test-file-conflict', 'content-v2', writeOpts);
			return Q.allSettled([attemptA, attemptB]);
		}).then((states) => {
			states.sort((a,b) => { 
				if (a.state == b.state) {
					return 0;
				} else if (a.state < b.state) {
					return -1;
				} else {
					return 1;
				}
			});
			assert.equal(states[0].state, 'fulfilled');
			assert.equal(states[1].state, 'rejected');
			return fs.read('test-file-conflict');
		}).then((content) => {
			assert.ok(content == 'content-v2' || content == 'content-v2-a');
		});
	});
}

addTests('Node FS', createNodeFs);
addTests('LocalStorage', createLocalStorageFs);

testLib.start();

