import react = require('react');
import react_addons = require('react/addons');

import { TransitionState } from './reactutil';

/** Props which are passed by TransitionContainer to its child
 * elements to notify them of the transition state, plus callbacks
 * which the child *must* use to notify the container when its
 * entry/exit transitions complete.
 */
export interface TransitionChildProps extends react.Props<{}> {
	/** The state of the transition, indicating whether the child
	 * is entering, idle or exiting.
	 */
	transitionState?: TransitionState;
	/** When transitionState is TransitionState.Entering, this
	 * is set to a callback that *must* be invoked by the child
	 * when the transition completes.
	 */
	onEntered?: () => void;
	/** When transitionState is TransitionState.Leaving, this
	 * is set to a callback that *must* be invoked by the child
	 * when the transition completes.
	 */
	onLeft?: () => void;
}

interface TransitionContainerChildProps extends react.Props<{}> {
	onLeft: (key: string | number) => void;
}

interface TransitionContainerChildState {
	transitionState: TransitionState;
	enteredCallback?: () => void;
	leftCallback?: () => void;
}

// Wraps a child component in a TransitionContainer and translates the component{Did,Will}{Appear,Enter,Leave}()
// callbacks to props which are passed to the child
class TransitionContainerChild extends react.Component<TransitionContainerChildProps, TransitionContainerChildState> {
	constructor(props: TransitionContainerChildProps, context: any) {
		super(props, context);

		this.state = {
			transitionState: TransitionState.WillEnter
		};
	}

	componentWillAppear(callback: () => void) {
		this.componentWillEnter(callback);
	}

	componentDidAppear() {
		this.componentDidEnter();
	}

	componentWillEnter(callback: () => void) {
		setTimeout(() => {
			this.setState({
				transitionState: TransitionState.Entering,
				enteredCallback: callback
			});
		}, 10);
	}

	componentDidEnter() {
		this.setState({
			transitionState: TransitionState.Entering,
			enteredCallback: undefined
		});
	}

	componentWillLeave(callback: () => void) {
		this.setState({
			transitionState: TransitionState.Leaving,
			leftCallback: callback
		});
	}

	componentDidLeave() {
		if (this.props.onLeft) {
			this.props.onLeft(this.props.key);
		}
	}

	render() {
		let child = react.Children.only(this.props.children);
		return react.cloneElement<any>(<react.ReactElement<{}>>child, {
			transitionState: this.state.transitionState,
			onEntered: this.state.enteredCallback,
			onLeft: this.state.leftCallback
		});
	}
}

export interface TransitionContainerProps extends react.Props<{}> {
	/** A callback which is invoked when the exit animation
	 * for a component completes.
	 */
	onComponentRemoved: (key: string | number) => void;
}

/** A CSSTransitionGroup-like container for animating the entry and exit of
 * child components. Whereas CSSTransitionGroup animates the entry and exit
 * of children by rendering them with specific CSS classes, TransitionContainer
 * renders its children with a `transitionState` prop that they can use to animate
 * entry/exit.
 *
 * TransitionContainer also provides a callback that the parent can use to determine
 * when a child component's exit animation has completed.
 */
export class TransitionContainer extends react.Component<TransitionContainerProps, {}> {
	render() {
		let children = react.Children.map(this.props.children, child =>
			react.createElement(<any>TransitionContainerChild, {
				key: (<any>child).props.key,
				onLeft: (key: string | number) => {
					if (this.props.onComponentRemoved) {
						this.props.onComponentRemoved(key);
					}
				}
			}, child)
			);
		return react.createElement(react_addons.addons.TransitionGroup, {}, children);
	}
}

export let TransitionContainerF = react.createFactory(TransitionContainer);
