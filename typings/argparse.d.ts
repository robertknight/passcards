declare module "argparse" {
	export var ArgumentParser : {
		new(options: {description : string}) : ArgumentParser;
	}

	export interface ArgumentOptions {
		action : string;
		dest? : string;
		nargs? : number;
		type? : string;
		defaultValue? : any;
	}

	export interface Subparsers {
		addParser(command: string) : ArgumentParser;
	}

	export interface ArgumentParser {
		addArgument(syntax : string[], options : ArgumentOptions) : void;
		addSubparsers(opts : {dest : string}) : Subparsers;
		parseArgs(args?: string[]) : any;
	}
}

