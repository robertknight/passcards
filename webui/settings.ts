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
	clear(setting: Setting) : void;
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

	clear(setting: Setting) {
		delete this.settings[setting];
		this.onChanged.publish(setting);
	}
}

var SETTING_KEY = 'passcards-settings';

interface SettingsDict {
	[index: string]: any;
}

export class LocalStorageStore extends SimpleStore {
	constructor() {
		super();

		// read initial settings
		var settings = this.readSettings();
		for (var key in settings) {
			this.set(<any>Setting[key], settings[key]);
		}

		// listen for future changes
		this.onChanged.listen((setting) => {
			var newValue = this.get(setting);
			var settings = this.readSettings();

			if (newValue === null || newValue === undefined) {
				delete settings[Setting[setting]];
			} else {
				settings[Setting[setting]] = newValue;
			}

			this.writeSettings(settings);
		});
	}

	private readSettings() {
		return <SettingsDict>JSON.parse(window.localStorage.getItem(SETTING_KEY)) || {};
	}

	private writeSettings(newSettings: SettingsDict) {
		window.localStorage.setItem(SETTING_KEY, JSON.stringify(newSettings));
	}
}

