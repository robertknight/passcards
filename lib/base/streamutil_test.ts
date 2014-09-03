import fs = require('fs');

import streamutil = require('./streamutil');
import testLib = require('../test');

testLib.addAsyncTest('read binary stream', (assert) => {
	var PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
	fs.writeFileSync('/tmp/test.png', new Buffer(PNG_MAGIC));
	var testFile = fs.createReadStream('/tmp/test.png');
	return streamutil.readAll(testFile).then((content) => {
		assert.equal(content, '\x89PNG');
	});
});

testLib.start();
