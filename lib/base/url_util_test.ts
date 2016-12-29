import testLib = require('../test');
import url_util = require('./url_util');

testLib.addTest('normalize URL', (assert) => {
	assert.equal(url_util.normalize(''), '');
	assert.equal(url_util.normalize('google.com'), 'https://google.com');
	assert.equal(url_util.normalize('https://acme.com/signin?param=foo&other_param=bar'), 'https://acme.com/signin');
});

testLib.addTest('URL domain', (assert) => {
	assert.equal(url_util.domain('https://foo.acme.com/signin?a=foo&b=bar'), 'foo.acme.com');
});
