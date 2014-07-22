// Typings for the Firefox add-on SDK.
//
// This is not a complete set of typings. It only covers the functionality
// currently used by the add-on and is updated as necessary.
//
// See https://addons.mozilla.org/developers/docs/sdk/latest/dev-guide

declare function require(module: string) : any;

// interfaces available to content scripts
interface CreateOptions {
	defineAs: string;
}

interface ExportFuncOptions {
	defineAs: string;
}

declare function createObjectIn<T>(object: Object, options: CreateOptions) : T;
declare function cloneInto<T>(object: T, target: Window) : T;
declare function exportFunction<F extends Function>(func: F, target: Object, options?: ExportFuncOptions) : F;

declare var unsafeWindow: Window;

// interfaces available for use in the main add-on script
interface PageWorker {
}

interface Port {
	emit(messageName: string, data?: any) : void;
	on(messageName: string, callback: (data?: any) => void) : void;
	once(messageName: string, callback: (data?: any) => void) : void;
}

declare module 'sdk/hotkeys' {
	export interface Options {
		combo: string;
		onPress: () => void;
	}

	export interface Hotkey {
		new(opts: Options): Hotkey;
	}

	export var Hotkey: Hotkey;
}

declare module 'sdk/panel' {
	export interface PanelOptions {
		width?: number;
		height?: number;
		contentURL?: string;
		contentScriptFile?: string;
		contentScriptWhen?: string;
		contentScriptOptions?: any;

		onHide: () => void;
	}

	export interface PanelShowOptions {
		position: any;
	}

	export interface Panel {
		new(opts: PanelOptions): Panel;

		port: Port;
		contentURL: string;

		show(opts: PanelShowOptions) : void;
	}

	export var Panel: Panel
}

declare module 'sdk/preferences/service' {
	export function set(pref: string, value: any) : void;
	export function get(pref: string, defaultValue: any) : void;
}

interface ButtonState {
	label?: string;
	checked?: boolean;
}

interface ButtonOptions {
	id: string;
	label: string;
	icon: string;
	onClick?: (state?: ButtonState) => void;
	onChange?: (state?: ButtonState) => void;
}

interface WorkerOptions {
	contentScriptFile: string;
}

interface ContentWorker {
	on(event: string, callback: () => void): void;
	port: Port;
	options: any;
}

declare module 'sdk/self' {
	export interface Data {
		url(path: string): string;
	}
	export var data: Data;
	export var id: string;
}

interface Tab {
	id: string;	
	url: string;
	attach(options: WorkerOptions): ContentWorker;
}

interface Tabs {
	[index: number]: Tab;
	on(event: string, callback: (tab?: Tab) => void) : void;
	activeTab: Tab;
}

declare module 'sdk/tabs' {
	var tabs: Tabs;
	export = tabs;
}

declare module 'sdk/ui/button/toggle' {
	export interface ToggleButton {
		new(opts: ButtonOptions): ToggleButton;
		state(target: any, state?: ButtonState) : ButtonState;
		click(): void;
	}

	export var ToggleButton: ToggleButton;
}


