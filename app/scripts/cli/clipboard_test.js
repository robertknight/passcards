var clipboard = require('./clipboard');
var testLib = require('../lib/test');

var clip = clipboard.createPlatformClipboard();

testLib.addAsyncTest('get/set/clear', function (assert) {
    clip.setData('hello world').then(function () {
        return clip.getData();
    }).then(function (content) {
        assert.equal(content, 'hello world');
        return clip.clear();
    }).then(function () {
        return clip.getData();
    }).then(function (content) {
        assert.equal(content, '');
        testLib.continueTests();
    }).done();
});

testLib.runTests();
//# sourceMappingURL=clipboard_test.js.map
