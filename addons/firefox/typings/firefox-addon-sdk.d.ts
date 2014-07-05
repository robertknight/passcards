declare function require(module: string) : any;

interface CreateOptions {
	defineAs: string;
}

declare function createObjectIn(object: Object, options: CreateOptions);
declare function cloneInto<T>(object: T, target: Window);
declare var unsafeWindow: Window;
