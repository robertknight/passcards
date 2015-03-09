import typed_react = require('typed-react');

import reactutil = require('./reactutil');

export interface TransitionMixinState {
	transition?: reactutil.TransitionState;
	transitionProperty?: string;
}

export interface TransitionMixinProps {
}

/** A mixin that assists with animating component transitions using CSS transitions.
 *
 * Unlike React.CSSTransitionGroup, the component itself is responsible for
 * defining which transition is used, rather than the owner of the component.
 *
 * This adds a 'transition' property to the component's state whose initial
 * value is TransitionState.Left. When the component is mounted it is
 * set to TransitionState.Entering and a moment later is changed to
 * TransitionState.Entered. When the component leaves, the state is
 * set to TransitionState.Leaving and finally it is set to
 * TransitionState.Left once the CSS transition completes.
 *
 * The mixin watches for the end of a specified CSS transition event and
 * notifies React when that completes.
 */
class TransitionMixin extends typed_react.Mixin<TransitionMixinProps, TransitionMixinState> {
	getInitialState() {
		return {
			transition: reactutil.TransitionState.Left
		};
	}

	componentWillEnter(callback: () => void) {
		if (!this.state.transitionProperty) {
			console.warn('A component including TransitionMixin did not specify a transitionProperty');
		}

		this.setState({ transition: reactutil.TransitionState.Entering });
		setTimeout(() => {
			if (!this.isMounted()) {
				return;
			}
			this.setState({ transition: reactutil.TransitionState.Entered });
		}, 10);
		var listener = new reactutil.TransitionEndListener(this, this.state.transitionProperty, () => {
			callback();
			listener.remove();
		});
	}

	componentWillLeave(callback: () => void) {
		this.setState({ transition: reactutil.TransitionState.Leaving });
		var listener = new reactutil.TransitionEndListener(this, this.state.transitionProperty, () => {
			this.setState({ transition: reactutil.TransitionState.Left });
			callback();
			listener.remove();
		});
	}
}

export var TransitionMixinM = typed_react.createMixin(TransitionMixin);

/** Returns the styling to apply to a component which fades in/out
  * in a given transition state.
  */
export function fadeIn(state: reactutil.TransitionState) {
	switch (state) {
		case reactutil.TransitionState.Entering:
			return {
				opacity: 0.01
			};
		case reactutil.TransitionState.Entered:
			return null;
		case reactutil.TransitionState.Leaving:
		// fall-through
		case reactutil.TransitionState.Left:
			return {
				opacity: 0.01
			};
	}
}

