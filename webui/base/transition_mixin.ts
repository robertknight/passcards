import typed_react = require('typed-react');

import reactutil = require('./reactutil');

export interface CSSTransitionMixinState {
	/** The current state of the component's entry/exit transition. */
	transition?: reactutil.TransitionState;
	/** The CSS property that is being animated.
	 * TransitionMixin listens for the CSS transition on this property
	 * having completed.
	 */
	transitionProperty?: string;
	/** The ref name of the element within the component that is
	 * being animated. If not specified, defaults to the component itself.
	 *
	 * TransitionMixin uses react.findDOMNode(this.refs[transitionComponent])
	 * to get the HTML element to watch for CSS animation/transition ends.
	 */
	transitionComponent?: string;
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
class CSSTransitionMixin extends typed_react.Mixin<TransitionMixinProps, CSSTransitionMixinState> {
	getInitialState() {
		return {
			transition: reactutil.TransitionState.Left
		};
	}

	componentWillEnter(callback: () => void) {
		if (!this.state.transitionProperty) {
			console.warn('A component including TransitionMixin did not specify a transitionProperty');
		}

		this.setState({ transition: reactutil.TransitionState.WillEnter });
		setTimeout(() => {
			if (!this.isMounted()) {
				return;
			}
			this.setState({ transition: reactutil.TransitionState.Entered });
		}, 10);

		let listener = new reactutil.TransitionEndListener(this.transitionComponent(), this.state.transitionProperty, () => {
			callback();
			listener.remove();
		});
	}

	componentWillLeave(callback: () => void) {
		this.setState({ transition: reactutil.TransitionState.Leaving });

		let listener = new reactutil.TransitionEndListener(this.transitionComponent(), this.state.transitionProperty, () => {
			this.setState({ transition: reactutil.TransitionState.Left });
			callback();
			listener.remove();
		});
	}

	private transitionComponent() {
		return this.state.transitionComponent ? this.refs[this.state.transitionComponent] : this;
	}
}

export var CSSTransitionMixinM = typed_react.createMixin(CSSTransitionMixin);

/** Returns the styling to apply to a component which fades in/out
  * in a given transition state.
  */
export function fadeIn(state: reactutil.TransitionState) {
	switch (state) {
		case reactutil.TransitionState.WillEnter:
			return {
				opacity: 0.01
			};
		case reactutil.TransitionState.Entered:
			// note: We return an object here
			// rather than null due to React issue #3409
			return {
				opacity: 1.0
			};
		case reactutil.TransitionState.Leaving:
		// fall-through
		case reactutil.TransitionState.Left:
			return {
				opacity: 0.01
			};
	}
}
