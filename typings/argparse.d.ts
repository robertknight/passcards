declare module "argparse" {
	export interface ArgumentParserOptions {
		description: string
	}

	export var ArgumentParser: {
		new (options: ArgumentParserOptions): ArgumentParser;
	}

	export interface ArgumentOptions {
		action?: string;
		dest?: string;
		nargs?: any; // number or string
		type?: string;
		defaultValue?: any;
		help?: string;
		choices?: string[];
	}

	export interface Subparsers {
		addParser(command: string, options?: ArgumentParserOptions): ArgumentParser;
	}

	export interface ArgumentParser {
		addArgument(syntax: string[], options?: ArgumentOptions): void;
		addSubparsers(opts: { dest: string }): Subparsers;
		parseArgs(args?: string[]): any;
	}
}
