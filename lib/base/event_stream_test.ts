import event_stream = require('./event_stream');
import testLib = require('../test');

testLib.addTest('simple event stream', (assert) => {
	var stream = new event_stream.EventStream<string>();

	var receivedStrings: string[] = [];

	var c1 = stream.listen((str) => {
		receivedStrings.push(str);
	});

	stream.publish('hello world');
	assert.deepEqual(receivedStrings, ['hello world']);
	stream.ignore(c1);
	stream.publish('ignore me');
	assert.deepEqual(receivedStrings, ['hello world']);
});

testLib.start();

