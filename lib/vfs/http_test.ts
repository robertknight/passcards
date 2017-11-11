import fs = require('fs');
import os = require('os');

import asyncutil = require('../base/asyncutil');
import http_vfs = require('./http');
import nodefs = require('./node');
import testLib = require('../test');
import vfs = require('./vfs');
import vfs_util = require('./util');

const PORT = 3002;
const HOSTNAME = `http://127.0.0.1:${PORT}`;

let fsRoot = <string>(<any>os).tmpdir() + '/http-vfs-test';

let fileVfs = new nodefs.FileVFS(fsRoot);
let httpVfsServer = new http_vfs.Server(fileVfs, {
    requireAuthentication: true,
});
let httpVfs = new http_vfs.Client(HOSTNAME);
httpVfs.setCredentials({ accessToken: http_vfs.ACCESS_TOKEN });

function setup(): Promise<void> {
    return vfs_util
        .rmrf(fileVfs, '.')
        .then(() => {
            return fileVfs.mkpath('.');
        })
        .then(() => {
            return fileVfs.mkpath('test-dir');
        })
        .then(() => {
            return fileVfs.write('test-file', 'file-content');
        })
        .then(() => {
            return fileVfs.write('test-dir/test-file-2', 'file2-content');
        })
        .then(() => {
            return httpVfsServer.listen(PORT);
        });
}

testLib.addTest('list dir', assert => {
    return httpVfs
        .list('test-dir')
        .then(files => {
            assert.equal(files.length, 1);
            return httpVfs.list('test-dir/');
        })
        .then(files => {
            assert.equal(files.length, 1);
        });
});

testLib.addTest('read file', assert => {
    return httpVfs.read('test-file').then(content => {
        assert.equal(content, 'file-content');
    });
});

testLib.addTest('write file', assert => {
    return httpVfs.write('test-file-3', 'file3-content').then(() => {
        assert.equal(
            fs.readFileSync(fsRoot + '/test-file-3').toString('binary'),
            'file3-content'
        );
    });
});

testLib.addTest('make path', assert => {
    return httpVfs.mkpath('test-dir-2/test-dir-3').then(() => {
        assert.ok(fs.statSync(fsRoot + '/test-dir-2/test-dir-3').isDirectory());
    });
});

testLib.addTest('remove file', assert => {
    fs.writeFileSync(fsRoot + '/test-remove-file', 'remove-me');
    return httpVfs.rm('test-remove-file').then(() => {
        assert.ok(!fs.existsSync(fsRoot + '/test-remove-file'));
    });
});

testLib.addTest('stat file', assert => {
    return httpVfs
        .stat('test-file')
        .then(stat => {
            assert.equal(stat.isDir, false);
            assert.equal(stat.name, 'test-file');
            return httpVfs.stat('test-dir');
        })
        .then(stat => {
            assert.equal(stat.isDir, true);
        });
});

testLib.addTest('request fails with wrong credentials', assert => {
    let httpVfs = new http_vfs.Client(HOSTNAME);
    httpVfs.setCredentials({ accessToken: 'wrongtoken' });
    return asyncutil.result(httpVfs.list('.')).then(result => {
        assert.ok(result.error instanceof vfs.VfsError);
    });
});

testLib.cancelAutoStart();
setup()
    .then(() => {
        testLib.teardownSuite(() => {
            httpVfsServer.close();
        });
        testLib.start();
    })
    .catch(err => console.error(err));
