// see http://coffeedoc.info/github/dropbox/dropbox-js/master/class_index.html
declare module "dropbox" {
	export interface ApiKeys {
		key : string
		secret : string
	}

	export var Client : {
		new(keys: ApiKeys) : Client;
	};

	export interface ApiError {
		status : number;
		method : string;
		url : string;
		responseText : string;
		response : any;
	}

	export interface EventSource<T> {
		addListener(fn: (data: T) => void) : EventSource<T>;
		removeListener(fn: (data: T) => void) : EventSource<T>;
	}

	export interface ReadFileOptions {
		// TODO
	}

	export interface WriteFileOptions {
		// TODO
	}

	export interface ReadDirOptions {
		// TODO
	}

	export module AuthDriver {
		export var NodeServer : {
			new(port: number) : AuthDriver;
		}
	}

	export interface AuthDriver {
		// TODO
	}

	export interface Client {
		authDriver(driver: AuthDriver) : Client;
		authenticate(callback : (error: any, account: string) => any) : Client;
		isAuthenticated() : boolean;
		readFile(path: string, options : ReadFileOptions, callback: (error: any, content: string) => void) : XMLHttpRequest;
		writeFile(path: string, content: string, options : WriteFileOptions, callback: (error:any) => void) : XMLHttpRequest;
		readdir(path: string, options : ReadDirOptions, callback: (error: any, names: string[], folderInfo: any, files: any[]) => void) : XMLHttpRequest;
		remove(path: string, callback: (error: any) => void) : XMLHttpRequest;
		setCredentials(credentials: any) : Client;
		onError : EventSource<ApiError>;
	}
}
