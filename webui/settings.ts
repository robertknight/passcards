import event_stream = require('../lib/base/event_stream');

export function accountKey(account: Account) {
	var serviceName = CloudService[account.cloudService];
	return `${serviceName.toLowerCase() }-${account.cloudAccountId}-${account.storePath}`;
}

export enum CloudService {
	Dropbox
}

export interface Account {
	/** Local ID of the account */
	id: string;

	/** Cloud storage where the data for this account is hosted */
	cloudService: CloudService;

	/** ID of the account on the cloud service */
	cloudAccountId: string;
	storePath: string;

	/** Name of the user associated with the account */
	name: string;
}

export interface AccountMap {
	[accountId: string]: Account;
}

export enum Setting {
	Version, // {number}
	AutoLockTimeout,
	/// ID of the active account
	ActiveAccount,
	Accounts // {AccountMap}
}

export interface Store {
	onChanged: event_stream.EventStream<Setting>;
	get<T>(setting: Setting): T;
	set(setting: Setting, value: any): void;
	clear(setting: Setting): void;
}

export class SimpleStore implements Store {
	onChanged: event_stream.EventStream<Setting>;

	private settings: { [index: number]: any };

	constructor() {
		this.settings = {};
		this.settings[Setting.AutoLockTimeout] = 2 * 60 * 1000;
		this.onChanged = new event_stream.EventStream<Setting>();
	}

	get<T>(setting: Setting) {
		return <T>this.settings[setting];
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
		var settings = <SettingsDict>JSON.parse(window.localStorage.getItem(SETTING_KEY)) || {};
		
		// settings migration
		if (Number(settings['Version']) < 1) {
			// ActiveAccount changed to local ID
			delete settings['ActiveAccount'];
			settings['Version'] = 1;
		}

		return settings;
	}

	private writeSettings(newSettings: SettingsDict) {
		window.localStorage.setItem(SETTING_KEY, JSON.stringify(newSettings));
	}
}

