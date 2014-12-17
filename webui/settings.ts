export enum Setting {
	AutoLockTimeout
}

export interface Store {
	get(setting: Setting) : any;
	set(setting: Setting, value: any) : void;
}

export class SimpleStore {
	private settings: {[index: number] : any};

	constructor() {
		this.settings = {};
		this.settings[Setting.AutoLockTimeout] = 2 * 60 * 1000;
	}

	get(setting: Setting) {
		return this.settings[setting];
	}

	set(setting: Setting, value: any) {
		this.settings[setting] = value;
	}
}

