declare function require(module: string) : any;

interface CreateOptions {
	defineAs: string;
}

interface ExportFuncOptions {
	defineAs: string;
}

declare function createObjectIn<T>(object: Object, options: CreateOptions) : T;
declare function cloneInto<T>(object: T, target: Window) : T;
declare function exportFunction<F extends Function>(func: F, target: Object, options?: ExportFuncOptions) : F;

declare var unsafeWindow: Window;
