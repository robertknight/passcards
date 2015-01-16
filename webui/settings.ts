import event_stream = require('../lib/base/event_stream');

export enum CloudService {
	Dropbox
}

export interface Account {
	cloudService: CloudService;
	accountName: string;
	storePath: string;
}

export enum Setting {
	AutoLockTimeout,
	ActiveAccount
}

export interface Store {
	onChanged: event_stream.EventStream<Setting>;
	get(setting: Setting) : any;
	set(setting: Setting, value: any) : void;
}

export class SimpleStore implements Store {
	onChanged: event_stream.EventStream<Setting>;

	private settings: {[index: number] : any};

	constructor() {
		this.settings = {};
		this.settings[Setting.AutoLockTimeout] = 2 * 60 * 1000;
		this.onChanged = new event_stream.EventStream<Setting>();
	}

	get(setting: Setting) {
		return this.settings[setting];
	}

	set(setting: Setting, value: any) {
		this.settings[setting] = value;
		this.onChanged.publish(setting);
	}
}

