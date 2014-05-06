import clipboard = require('./clipboard');
import testLib = require('../lib/test');

var clip = clipboard.createPlatformClipboard();

testLib.addAsyncTest('get/set/clear', (assert) => {
	clip.setData('hello world').then(() => {
		return clip.getData();
	})
	.then((content) => {
		assert.equal(content, 'hello world');
		return clip.clear();
	})
	.then(() => {
		return clip.getData();
	})
	.then((content) => {
		assert.equal(content, '');
		testLib.continueTests();
	})
	.done();
});

testLib.runTests();
