/// <reference path="react/react.d.ts" />
/// <reference path="react-addons/react-addons.d.ts" />
/// <reference path="../node_modules/typed-react/typed-react.d.ts" />

declare module React {
	// functionality added in React 0.12
	export function createFactory(f: any) : any;
    export function render<P>(component: Descriptor<P>, container: Element, callback?: () => void): Descriptor<P>;
}
