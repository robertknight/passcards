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
	var result = Q.defer<vfs.VFS>();
	vfs.VFSUtil.rmrf(fs, '')
	.then(() => {
		return fs.mkpath(TEST_DIR);
	}).then(() => {
		return vfs.VFSUtil.listRecursive(fs, '')
	}).then((files) => {
		if (files.length > 0) {
			result.reject('Failed to remove all files');
			return;
		}
		result.resolve(fs);
	})
	.done();

	return result.promise;
}

var createLocalStorageFs = () => {
	return Q.resolve(new localstoragefs.FS('/1pass-web-test', new FakeLocalStorage));
}

function addTests(fsName: string, createFs: () => Q.Promise<vfs.VFS>) {
	testLib.addAsyncTest(fsName + ': Read and write file', (assert) => {
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

	testLib.addAsyncTest(fsName + ': Stat file', (assert) => {
		var fs = createFs();
		fs.then((fs) => {
			var fileInfo = fs.write('test-stat-file', 'test-content').then(() => {
				return fs.stat('test-stat-file');
			});
			fileInfo.then((info) => {
				testLib.assertEqual(assert, info, {
					name: 'test-stat-file',
					path: 'test-stat-file',
					isDir: false
				});
				testLib.continueTests();
			}).done();
		}).done();
	});

	testLib.addAsyncTest(fsName + ': Create dir', (assert) => {
		var fs = createFs();
		fs.then((fs) => {
			var dirmade = fs.mkpath('foo/bar');
			var dirInfo = dirmade.then(() => {
				return fs.stat('foo/bar');
			});
			dirInfo.then((info) => {
				testLib.assertEqual(assert, info, {
					name: 'bar',
					path: 'foo/bar',
					isDir: true
				});
				testLib.continueTests();
			}).done();
		}).done();
	});

	testLib.addAsyncTest(fsName + ': List folder', (assert) => {
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
						path: 'test-list-folder',
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
					testLib.assertEqual(assert, files[0], expectedFile);
					testLib.continueTests();
				});
			}).done();
		}).done();
	});

	testLib.addAsyncTest(fsName + ': Copy dir', (assert) => {
		var fs = createFs();
		fs.then((fs) => {
			// create a dir hierarchy in 'src', copy it
			// to 'dest', list both hierarchies and compare
			// the sorted results
			fs.mkpath('src').then(() => {
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
			}).then((destFiles) => {
				vfs.VFSUtil.listRecursive(fs, 'src').then((srcFiles) => {
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
					testLib.continueTests();
				}).done();
			})
			.done();
		}).done();
	});

	testLib.addAsyncTest(fsName + ': ignore paths above root', (assert) => {
		createFs().then((fs) => {
			return fs.list('../../');
		}).then((files) => {
			assert.equal(files.length, 0);
			testLib.continueTests();
		}).done();
	});
}

addTests('Node FS', createNodeFs);
addTests('LocalStorage', createLocalStorageFs);

testLib.start();

