import node_vfs = require('./node');
import testLib = require('../test');
import vfs_util = require('./util');

testLib.addAsyncTest('mktemp', (assert) => {
	var fs = new node_vfs.FileVFS('/tmp');
	return vfs_util.mktemp(fs, '/').then((path) => {
		assert.ok(path.match(/\/tmp.[a-z]{3}/) !== null);
	});
});
