import rpc = require('./rpc');
import testLib = require('../test');
import { defer, nodeResolver } from '../base/promise_util';

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

    on(method: string, handler: (data: any) => any): void {
        this.handlers.push({
            method: method,
            callback: handler,
        });
    }

    emit(method: string, data: Object): void {
        this.receiver.handlers.forEach(handler => {
            if (handler.method == method) {
                handler.callback(data);
            }
        });
    }
}

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
            data: message,
        });
    }
}

testLib.addTest('simple rpc call and reply', assert => {
    var clientPort = new FakePort();
    var serverPort = new FakePort(clientPort);

    var client = new rpc.RpcHandler(clientPort);
    var server = new rpc.RpcHandler(serverPort);

    server.on('add', (a, b) => {
        return a + b;
    });

    let done = defer<void>();
    client.call('add', [3, 4], (err, sum) => {
        assert.equal(sum, 7);
        done.resolve(null);
    });
    return done.promise;
});

testLib.addTest('rpc error', assert => {
    var clientPort = new FakePort();
    var serverPort = new FakePort(clientPort);

    var client = new rpc.RpcHandler(clientPort);
    var server = new rpc.RpcHandler(serverPort);

    server.on('divide', (a, b) => {
        if (b === 0) {
            throw new Error('divide-by-zero');
        }
        return a / b;
    });

    let done = defer<void>();
    client.call('divide', [4, 0], (err, result) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'divide-by-zero');
        done.resolve(null);
    });
    return done.promise;
});

testLib.addTest('rpc async call and reply', assert => {
    var clientPort = new FakePort();
    var serverPort = new FakePort(clientPort);

    var client = new rpc.RpcHandler(clientPort);
    var server = new rpc.RpcHandler(serverPort);

    server.onAsync('add', (done, a, b) => {
        done(null, a + b);
    });

    let done = defer<void>();
    client.call('add', [5, 6], (err, sum) => {
        assert.equal(sum, 11);
        done.resolve(null);
    });
    return done.promise;
});

testLib.addTest('rpc async error', assert => {
    var clientPort = new FakePort();
    var serverPort = new FakePort(clientPort);

    var client = new rpc.RpcHandler(clientPort);
    var server = new rpc.RpcHandler(serverPort);

    // handler that passes an error to done()
    server.onAsync('divide', (done, a, b) => {
        if (b === 0) {
            done(new Error('divide-by-zero'), null);
        } else {
            done(null, a / b);
        }
    });

    // handler that throws an exception directly in onAsync()
    server.onAsync('divide2', (done, a, b) => {
        if (b === 0) {
            throw new Error('divide-by-zero');
        } else {
            done(null, a / b);
        }
    });

    let done = defer<void>();
    client.call('divide', [5, 0], (err, result) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'divide-by-zero');

        client.call('divide2', [3, 0], (err, result) => {
            assert.ok(err instanceof Error);
            assert.equal(err.message, 'divide-by-zero');
            done.resolve(null);
        });
    });
    return done.promise;
});

testLib.addTest('window.postMessage() rpc call and reply', assert => {
    var fakeWindowA = new FakeWindow();
    var fakeWindowB = new FakeWindow(fakeWindowA);

    // create two ports which exchange messages between each other
    var windowPortA = new rpc.WindowMessagePort(
        fakeWindowA,
        '*',
        'port-a',
        'port-b'
    );
    var windowPortB = new rpc.WindowMessagePort(
        fakeWindowB,
        '*',
        'port-b',
        'port-a'
    );

    // create another port connected to the first window, but with
    // a receive tag set to a different value so it shouldn't receive messages
    // sent to the first port
    var windowPortC = new rpc.WindowMessagePort(
        fakeWindowA,
        '*',
        'port-c',
        'port-d'
    );

    var client = new rpc.RpcHandler(windowPortA);
    var server = new rpc.RpcHandler(windowPortB);
    var server2 = new rpc.RpcHandler(windowPortC);

    var server1Calls = 0;
    var server2Calls = 0;

    server.on('add', (a, b) => {
        ++server1Calls;
        return a + b;
    });
    server2.on('add', (a, b) => {
        ++server2Calls;
        return 0;
    });

    let done = defer<void>();
    client.call('add', [3, 4], (err, sum) => {
        assert.equal(sum, 7);
        assert.equal(server1Calls, 1);
        assert.equal(server2Calls, 0);
        done.resolve(null);
    });
    return done.promise;
});

testLib.addTest('rpc-promise bridge', assert => {
    var clientPort = new FakePort();
    var serverPort = new FakePort(clientPort);

    var client = new rpc.RpcHandler(clientPort);
    var server = new rpc.RpcHandler(serverPort);

    server.on('greet', () => {
        return 'hello';
    });

    var greeting = defer<string>();
    client.call('greet', [], nodeResolver(greeting));

    return greeting.promise.then(message => {
        assert.equal(message, 'hello');
    });
});

testLib.addTest(
    'reports an error if RPC handler fails to reply within a timeout',
    assert => {
        var clientPort = new FakePort();
        var serverPort = new FakePort(clientPort);

        var client = new rpc.RpcHandler(clientPort);
        var server = new rpc.RpcHandler(serverPort);

        server.onAsync('greet', done => {
            // do nothing
        });

        let done = defer<void>();
        client.call(
            'greet',
            [],
            (err, result) => {
                assert.ok(err);
                assert.equal(result, undefined);
                done.resolve(null);
            },
            100 /* use a short timeout */
        );
        return done.promise;
    }
);
