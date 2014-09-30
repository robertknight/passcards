/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />

declare module React {
	interface CSSTransitionGroupProps {
		transitionName: string;
		transitionEnter?: boolean;
		transitionLeave?: boolean;
	}

	export var addons: {
		CSSTransitionGroup: ReactComponentFactory<CSSTransitionGroupProps, ReactComponent<CSSTransitionGroupProps, void>>;
	}
}

declare module 'react/addons' {
	export = React;
}
