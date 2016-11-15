import clipboard = require('./clipboard');
import testLib = require('../lib/test');

var clip = clipboard.createPlatformClipboard();

testLib.addTest('get/set/clear', (assert) => {
	return clip.setData('hello world').then(() => {
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
	});
});

testLib.start();
