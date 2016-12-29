export enum Level {
	Info,
	Warn,
	Error
}

export interface Logger {
	info(...args: any[]): void;
	warn(...args: any[]): void;
	error(...args: any[]): void;
}

export class BasicLogger {
	name: string;
	level: Level;

	constructor(name: string) {
		this.name = name;
		this.level = Level.Warn;
	}

	info(...args: any[]) {
		this.output(Level.Info, args);
	}

	warn(...args: any[]) {
		this.output(Level.Warn, args);
	}

	error(...args: any[]) {
		this.output(Level.Error, args);
	}

	private output(level: Level, args: any[]) {
		if (this.level > level || args.length === 0) {
			return;
		}

		let prefix = `${this.name}: `;
		if (typeof args[0] === 'string') {
			// first argument is a format string, so must
			// remain the first argument to console.log()
			args[0] = prefix + args[0];
		} else {
			args.unshift(this.name);
		}
		console.log.apply(console, args);
	}
}
