import fs = require('fs');

import streamutil = require('./streamutil');
import testLib = require('../test');

testLib.addTest('read binary stream', assert => {
    const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
    const TEST_PATH = `${testLib.tempDir()}/test.png`;

    fs.writeFileSync(TEST_PATH, new Buffer(PNG_MAGIC));
    let testFile = fs.createReadStream(TEST_PATH);
    return streamutil.readAll(testFile).then(content => {
        assert.equal(content, '\x89PNG');
    });
});
