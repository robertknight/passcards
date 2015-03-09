import child_process = require('child_process');

/** Emulation of the Web Worker interface for NodeJS
  * using a child process.
  *
  * Within the child, WorkerClient can be used to communicate
  * with the parent where `self` would normally be used
  * in a web worker.
  */
export class Worker {
	private process: child_process.ChildProcess;

	onmessage: (e: any) => any;
	onerror: (e: ErrorEvent) => any;

	constructor(scriptUrl: string) {
		this.process = child_process.fork(scriptUrl);
		this.process.on('message', (msg: any) => {
			if (this.onmessage) {
				this.onmessage({ data: msg });
			}
		});
		this.process.on('error', (err: any) => {
			if (this.onerror) {
				this.onerror(err);
			}
		});

		process.on('exit', () => {
			this.terminate();
		});
	}

	postMessage(obj: any) {
		this.process.send(obj, undefined /* [sendHandle] */);
	}

	addEventListener(event: string, callback: Function) {
		if (event == 'message') {
			this.process.on('message', (message: any) => {
				callback({ data: message });
			});
		}
	}

	terminate() {
		this.process.kill();
	}
}

/** Emulation of the `self` variable exposed
  * to the global scope of Web Workers for communicating
  * with the parent worker.
  */
export class WorkerClient {
	onmessage: (e: any) => any;

	constructor() {
		process.on('message', (message: any) => {
			if (this.onmessage) {
				this.onmessage({ data: message });
			}
		});
	}

	close() {
		process.exit(0);
	}

	postMessage(message?: any, ports?: any) {
		process.send(message);
	}

	addEventListener(event: string, callback: Function) {
		if (event == 'message') {
			process.on('message', (message: any) => {
				callback({ data: message });
			});
		}
	}
}

