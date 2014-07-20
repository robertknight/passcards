/** `rpc` provides an interface for making RPC calls between
  * isolated objects such as two Windows in different domains,
  * workers or browser extension scripts and web front-ends etc.
  *
  * This module uses callbacks rather than promises for portability
  * between different Javascript environments (standard browser
  * context, web workers, priviledged extension scripts, sandboxed
  * 'content' scripts in browser extensions etc.)
  */

/** Client provides a call() method to invoke an RPC
  * call on the server and receive a promise for the result.
  */
export interface Client {
	call<R>(method: string, args: any[], callback: (err: any, result: R) => void) : void;
}

/** Provides an interface for handling an RPC call.
  */
export interface Server {
	on<R>(method: string, handler: (args: any) => R) : void;
}

export interface Message {
	id: number;
	method: string;
}

export interface CallMessage extends Message {
	payload: any[];
}

export interface ReplyMessage extends Message {
	result: any;
}

/** Interface for sending and receiving messages to/from a remote
  * object such as a window or web worker.
  */
export interface MessagePort<Call,Reply> {
	on(method: string, handler: Function) : void;
	on(method: 'rpc-call', handler: (call: Call) => void) : void;
	on(method: 'rpc-reply', handler: (reply: Reply) => void) : void;

	emit(method: string, data: Object) : void;
	emit(method: 'rpc-call', data: Call) : void;
	emit(method: 'rpc-reply', data: Reply) : void;
}

/** Subset of the DOM Window interface related to sending and receiving
  * messages to/from other windows.
  */
export interface WindowMessageInterface {
	addEventListener(event: string, handler: Function) : void;
	addEventListener(event: 'message', handler: (ev: MessageEvent) => any) : void;
	postMessage(message: any, targetOrigin: string) : void;
}

/** A MessagePort implementation which uses the Window.postMessage() and
  * Window.addEventListener() APIs for use with RpcHandler
  */
export class WindowMessagePort {
	constructor(public window: WindowMessageInterface, public targetOrigin: string) {
	}

	on(method: string, handler: Function) : void {
		this.window.addEventListener('message', (ev: MessageEvent) => {
			if ('rpcMethod' in ev.data && ev.data.rpcMethod == method) {
				handler(ev.data.data);
			}
		});
	}

	emit(method: string, data: Object) : void {
		this.window.postMessage({
			rpcMethod: method,
			data: data
		}, this.targetOrigin);
	}
}

/** Simple RPC implementation. RpcHandler implements both the
  * client and server-sides of an RPC handler.
  */
export class RpcHandler implements Client, Server {
	private id: number;
	private pending: {
		id: number;
		method: string;
		callback: Function;
	}[];
	private handlers: {
		method: string;
		callback: (args: any) => any;
		isAsync: boolean;
	}[];

	/** Construct an RPC handler which uses @p port to send and receive
	  * messages to/from the other side of the connection.
	  */
	constructor(public port: MessagePort<CallMessage, ReplyMessage>) {
		this.id = 1;
		this.handlers = [];
		this.pending = [];

		this.port.on('rpc-reply', (reply: ReplyMessage) => {
			var pending = this.pending.filter((pending) => {
				return pending.id == reply.id;
			});
			if (pending.length != 1) {
				throw new Error('No matching RPC call found for method: ' + reply.method)
			}
			pending[0].callback(null, reply.result);
		});

		this.port.on('rpc-call', (call: CallMessage) => {
			var handled = false;
			this.handlers.forEach((handler) => {
				if (handler.method == call.method) {
					if (handler.isAsync) {
						var done = (result: any) => {
							this.port.emit('rpc-reply', {
								id: call.id,
								method: call.method,
								result: result
							});
						};
						handler.callback.apply(null, [done].concat(call.payload));
					} else {
						var result = handler.callback.apply(null, call.payload);
						var reply = {
							id: call.id,
							method: call.method,
							result: result
						};
						this.port.emit('rpc-reply', reply);
					}
					handled = true;
				}
			});
			if (!handled) {
				throw new Error('No handler found for method: ' + call.method);
			}
		});
	}

	call<R>(method: string, args: any[], callback: (err: any, result: R) => void) {
		var call = {
			id: ++this.id,
			method: method,
			payload: args
		};
		var pending = {
			id: call.id,
			method: method,
			callback: callback
		};
		this.pending.push(pending);
		this.port.emit('rpc-call', call);
	}

	on<R>(method: string, handler: (...args: any[]) => R) {
		this.handlers.push({
			method: method,
			callback: handler,
			isAsync: false
		});
	}

	onAsync<R>(method: string, handler: (done: (result: R) => void, ...args: any[]) => void) {
		this.handlers.push({
			method: method,
			callback: handler,
			isAsync: true
		});
	}
}

