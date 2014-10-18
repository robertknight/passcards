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

testLib.addTest('event listener contexts', (assert) => {
	var stream = new event_stream.EventStream<string>();
	stream.maxListeners = 30;

	var receivedStrings: string[] = [];

	var listener = (str: string) => {
		receivedStrings.push(str);
	};

	// add a listener twice with no context object.
	// It should be added twice
	stream.listen(listener);
	stream.listen(listener);
	assert.equal(stream.listenerCount(), 2);

	// try adding a listener twice with the same
	// context object. It should be added only once
	stream.listen(listener, 'context');
	assert.equal(stream.listenerCount(), 3);
	stream.listen(listener, 'context');
	assert.equal(stream.listenerCount(), 3);

	stream.publish('hello world');
	assert.equal(receivedStrings.length, 3);
});

testLib.start();

