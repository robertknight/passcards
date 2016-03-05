import react = require('react');
import * as TransitionGroup from 'react-addons-transition-group';

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
	onLeft: () => void;
}

interface TransitionContainerChildState {
	transitionState: TransitionState;
	enteredCallback?: () => void;
	leftCallback?: () => void;
}

type TimerHandler = NodeJS.Timer | number;

// Wraps a child component in a TransitionContainer and translates the component{Did,Will}{Appear,Enter,Leave}()
// callbacks to props which are passed to the child
class TransitionContainerChild extends react.Component<TransitionContainerChildProps, TransitionContainerChildState> {

	enterTimer: TimerHandler;

	constructor(props: TransitionContainerChildProps, context: any) {
		super(props, context);

		this.state = {
			transitionState: TransitionState.WillEnter
		};
	}

	componentWillUnmount() {
		if (this.enterTimer) {
			// component was unmounted whilst entering.
			// This can happen if the TransitionContainer is unmounted
			// during the entry animation
			clearTimeout(<any>this.enterTimer);
		}
	}

	componentWillAppear(callback: () => void) {
		this.componentWillEnter(callback);
	}

	componentDidAppear() {
		this.componentDidEnter();
	}

	componentWillEnter(callback: () => void) {
		let entered = false;
		this.enterTimer = setTimeout(() => {
			this.setState({
				transitionState: TransitionState.Entered,
				enteredCallback: () => {
					if (entered) {
						return;
					}
					entered = true;
					callback();
				}
			});
		}, 10);
	}

	componentDidEnter() {
		this.setState({
			transitionState: TransitionState.Entered,
			enteredCallback: undefined
		});
	}

	componentWillLeave(callback: () => void) {
		let left = false;
		this.setState({
			transitionState: TransitionState.Leaving,
			leftCallback: () => {
				if (left) {
					return;
				}
				left = true;
				callback();
			}
		});
	}

	componentDidLeave() {
		if (this.props.onLeft) {
			this.props.onLeft();
		}
	}

	render() {
		let child = react.Children.only(this.props.children);
		let newProps = {
			transitionState: this.state.transitionState,
			onEntered: this.state.enteredCallback,
			onLeft: this.state.leftCallback
		};
		return react.cloneElement(child, newProps);
	}
}

export interface TransitionContainerProps extends react.Props<{}> {
	/** A callback which is invoked when the exit animation
	 * for a component completes.
	 */
	onComponentRemoved?: (key: string | number) => void;
}

/** A React.addons.CSSTransitionGroup-like container for animating the entry and exit of
 * child components. Whereas CSSTransitionGroup animates the entry and exit
 * of children by rendering them with specific CSS classes, TransitionContainer
 * renders its children with a `transitionState` prop that they can use to animate
 * entry/exit.
 *
 * TransitionContainer also provides a callback that the parent can use to determine
 * when a child component's exit animation has completed.
 *
 * The props added to children rendered by TransitionContainer are declared in
 * TransitionContainerChildProps
 */
export class TransitionContainer extends react.Component<TransitionContainerProps, {}> {
	render() {
		let children = react.Children.map(this.props.children, child => this.wrapChild(child));
		return react.createElement(TransitionGroup, {}, children);
	}

	// wraps a child with a TransitionContainerChild which maps transition
	// lifecycle callbacks to props that are passed down to the child
	private wrapChild(child: react.ReactElement<{}> | string | number) {
		let key = (<any>child).key;
		return react.createElement(<any>TransitionContainerChild, {
			key: key,
			onLeft: () => {
				if (this.props.onComponentRemoved) {
					this.props.onComponentRemoved(key);
				}
			}
		}, child)
	}
}

export let TransitionContainerF = react.createFactory(TransitionContainer);
