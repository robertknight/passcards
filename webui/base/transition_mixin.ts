import typed_react = require('typed-react');

import reactutil = require('./reactutil');

export interface TransitionMixinState {
	transition?: reactutil.TransitionState;
}

export interface TransitionMixinProps {
}

/* A mixin that assists with animating component transitions using CSS transitions.
 *
 * This adds a 'transition' attribute to the component's state whose initial
 * value is TransitionState.Left. When the component is mounted it is
 * set to TransitionState.Entering and a moment later is changed to
 * TransitionState.Entered. When the component leaves, the state is
 * set to TransitionState.Leaving.
 *
 * The mixin watches for the end of a specified CSS transition event and
 * notifies React when that completes.
 */
class TransitionMixin extends typed_react.Mixin<TransitionMixinProps, TransitionMixinState> {
	getInitialState() {
		return {
			transition: reactutil.TransitionState.Left
		}
	}

	componentWillEnter(callback: () => void) {
		this.setState({transition: reactutil.TransitionState.Entering});
		setTimeout(() => {
			if (!this.isMounted()) {
				return;
			}
			this.setState({transition: reactutil.TransitionState.Entered});
		}, 10);
		var listener = new reactutil.TransitionEndListener(this, 'transform', () => {
			callback();
			listener.remove();
		});
	}

	componentWillLeave(callback: () => void) {
		this.setState({transition: reactutil.TransitionState.Leaving});
		var listener = new reactutil.TransitionEndListener(this, 'transform', () => {
			this.setState({transition: reactutil.TransitionState.Left});
			callback();
			listener.remove();
		});
	}
}

export var TransitionMixinM = typed_react.createMixin(TransitionMixin);

