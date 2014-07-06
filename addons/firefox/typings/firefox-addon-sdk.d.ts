declare function require(module: string) : any;

interface CreateOptions {
	defineAs: string;
}

interface ExportFuncOptions {
	defineAs: string;
}

declare function createObjectIn(object: Object, options: CreateOptions);
declare function cloneInto<T>(object: T, target: Window);
declare function exportFunction(func: Function, target: Object, options?: ExportFuncOptions);

declare var unsafeWindow: Window;
