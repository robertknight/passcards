var Path = require('path');
var Q = require('q');

var testLib = require('./test');
var vfs = require('./vfs');
var nodefs = require('./nodefs');

var createFs = function () {
    var TEST_DIR = '/tmp/vfs-test';
    var fs = new nodefs.FileVFS(TEST_DIR);
    var result = Q.defer();
    vfs.VFSUtil.rmrf(fs, TEST_DIR).then(function () {
        return fs.mkpath(TEST_DIR);
    }).then(function () {
        result.resolve(fs);
    }).done();

    return result.promise;
};

testLib.addAsyncTest('Read and write file', function (assert) {
    var fs = createFs();
    fs.then(function (fs) {
        var fileWritten = fs.write('test-file', 'test-content');
        var contentRead = fileWritten.then(function () {
            return fs.read('test-file');
        });
        contentRead.then(function (content) {
            assert.equal(content, 'test-content', 'File contents match');
            testLib.continueTests();
        }).done();
    }).done();
});

testLib.addAsyncTest('Stat file', function (assert) {
    var fs = createFs();
    fs.then(function (fs) {
        var fileInfo = fs.write('test-stat-file', 'test-content').then(function () {
            return fs.stat('test-stat-file');
        });
        fileInfo.then(function (info) {
            testLib.assertEqual(assert, info, {
                name: 'test-stat-file',
                path: Path.join(fs.root, 'test-stat-file'),
                isDir: false
            });
            testLib.continueTests();
        }).done();
    }).done();
});

testLib.addAsyncTest('Create dir', function (assert) {
    var fs = createFs();
    fs.then(function (fs) {
        var dirmade = fs.mkpath('foo/bar');
        var dirInfo = dirmade.then(function () {
            return fs.stat('foo/bar');
        });
        dirInfo.then(function (info) {
            testLib.assertEqual(assert, info, {
                name: 'bar',
                path: Path.join(fs.root, 'foo/bar'),
                isDir: true
            });
            testLib.continueTests();
        }).done();
    }).done();
});

testLib.addAsyncTest('List folder', function (assert) {
    var fs = createFs();
    fs.then(function (fs) {
        var fileWritten = fs.write('test-list-folder', 'test-content');
        var fileList = fileWritten.then(function () {
            return fs.list('.');
        });

        fileList.then(function (files) {
            var found = false;
            files.forEach(function (file) {
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

testLib.addAsyncTest('Search folder', function (assert) {
    var fs = createFs();
    fs.then(function (fs) {
        var fileWritten = fs.write('test-search-folder', 'test-content');
        fileWritten.then(function () {
            fs.search('search-fold', function (files) {
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
    }).done();
});

testLib.runTests();
//# sourceMappingURL=vfs_test.js.map
