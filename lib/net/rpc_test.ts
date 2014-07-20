import rpc = require('./rpc');
import testLib = require('../test');

class FakePort implements rpc.MessagePort<rpc.CallMessage, rpc.ReplyMessage> {
	private handlers: {
		method: string;
		callback: (data: any) => any;
	}[];

	constructor(public receiver?: FakePort) {
		this.handlers = [];
		if (receiver) {
			this.receiver.receiver = this;
		}
	}

	on(method: string, handler: (data: any) => any) : void {
		this.handlers.push({
			method: method,
			callback: handler
		});
	}

	emit(method: string, data: Object) : void {
		this.receiver.handlers.forEach((handler) => {
			if (handler.method == method) {
				handler.callback(data);
			}
		});
	}
};

class FakeWindow implements rpc.WindowMessageInterface {
	private port: FakePort;

	constructor(public receiver?: FakeWindow) {
		if (receiver) {
			this.port = new FakePort(receiver.port);
		} else {
			this.port = new FakePort();
		}
	}

	addEventListener(event: string, handler: (ev: MessageEvent) => void) {
		this.port.on('message', (ev: MessageEvent) => {
			handler(ev);
		});
	}

	postMessage(message: any, targetOrigin: string) {
		this.port.emit('message', {
			data: message
		});
	}
};

testLib.addAsyncTest('rpc call and reply', (assert) => {
	var clientPort = new FakePort();
	var serverPort = new FakePort(clientPort);

	var client = new rpc.RpcHandler(clientPort);
	var server = new rpc.RpcHandler(serverPort);

	server.on('add', (a, b) => {
		return a + b;
	});

	var message = '';
	server.on('sayHello', () => {
		message = 'hello world';
	});

	client.call('add', 3, 4).then((sum) => {
		assert.equal(sum, 7);
		return client.call('sayHello');
	}).then(() => {
		assert.equal(message, 'hello world');
		testLib.continueTests();
	}).done();
});

testLib.addAsyncTest('window.postMessage() rpc call and reply', (assert) => {
	var fakeWindowA = new FakeWindow();
	var fakeWindowB = new FakeWindow(fakeWindowA);

	var windowPortA = new rpc.WindowMessagePort(fakeWindowA, '*');
	var windowPortB = new rpc.WindowMessagePort(fakeWindowB, '*');

	var client = new rpc.RpcHandler(windowPortA);
	var server = new rpc.RpcHandler(windowPortB);

	server.on('add', (a, b) => {
		return a + b;
	});
	client.call('add', 3, 4).then((sum) => {
		assert.equal(sum, 7);
		testLib.continueTests();
	}).done();
});

testLib.start();
