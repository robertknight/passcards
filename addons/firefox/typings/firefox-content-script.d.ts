// interfaces available to content scripts
interface CreateOptions {
	defineAs: string;
}

interface ExportFuncOptions {
	defineAs: string;
}

declare function createObjectIn<T>(object: Object, options: CreateOptions): T;
declare function cloneInto<T>(object: T, target: Window): T;
declare function exportFunction<F extends Function>(func: F, target: Object, options?: ExportFuncOptions): F;

declare var unsafeWindow: Window;

interface ContentWorker {
	on(event: 'detach', callback: () => void): void;
	on(event: 'error', callback: (err: Error) => void): void;
	on(event: string, callback: () => void): void;
	port: Port;
	options: any;
}

interface Port {
	emit(messageName: string, data?: any): void;
	on(messageName: string, callback: (data?: any) => void): void;
	once(messageName: string, callback: (data?: any) => void): void;
}


