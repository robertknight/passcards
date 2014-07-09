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

declare module 'sdk/panel' {
	export interface PanelOptions {
		width?: number;
		height?: number;
		contentURL?: string;
		contentScriptFile?: string;
		contentScriptWhen?: string;

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

declare module 'sdk/ui/button/toggle' {
	export interface ToggleButton {
		new(opts: ButtonOptions): ToggleButton;
		state(target: any, state?: ButtonState) : ButtonState;
	}

	export var ToggleButton: ToggleButton;
}

interface WorkerOptions {
	contentScriptFile: string;
}

interface ContentWorker {
	port: Port;
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

declare module 'sdk/preferences/service' {
	export function set(pref: string, value: any) : void;
}

