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
		args[0] = `${this.name}: ${args[0]}`;
		console.log.apply(console, args);
	}
}

