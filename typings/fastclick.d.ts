declare module "fastclick" {
	export interface Options {
		tapDelay: number;
		touchBoundary: number;
	}

	export class FastClick {
		trackingClick: boolean;
		trackingClickStart: number;
		targetElement: HTMLElement;
		touchStartX: number;
		touchStartY: number;
		lastTouchIdentifier: number;
		touchBoundary: number;
		layer: HTMLElement;

		destroy() : void;

		static attach(layer: HTMLElement, options?: Options) : FastClick;
	}
}
