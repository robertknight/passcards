declare function require(module: string) : any;

interface CreateOptions {
	defineAs: string;
}

declare function createObjectIn(object: Object, options: CreateOptions);
declare var unsafeWindow: Window;
