import { Component, DOM, createFactory } from 'react';
import { render } from 'react-dom';
import * as Q from 'q';

import { addTest } from '../../lib/test';
import { TransitionContainerF, TransitionChildProps } from './transition_container';
import { TransitionState } from './reactutil';
import { runReactTest } from '../test_utils';

interface ChildProps extends TransitionChildProps {
	transitionStates?: TransitionState[];
}

class Child extends Component<ChildProps, {}> {
	transitionStates: TransitionState[];

	constructor(props: ChildProps, context: any) {
		super(props, context);
	}

	componentWillReceiveProps(nextProps: ChildProps) {
		if (nextProps.onEntered) {
			setTimeout(nextProps.onEntered, 10);
		}
		if (nextProps.onLeft) {
			setTimeout(nextProps.onLeft, 10);
		}
	}

	render() {
		if (this.props.transitionStates) {
			this.props.transitionStates.push(this.props.transitionState);
		}
		return DOM.div();
	}
}

let ChildF = createFactory(Child);

addTest('should render child with transition props', assert => {
	return runReactTest(element => {
		let observedStates: TransitionState[] = [];
		render(TransitionContainerF({},
			ChildF({ transitionStates: observedStates })), element);

		return Q.delay(100).then(() => {
			assert.deepEqual(observedStates, [
				TransitionState.WillEnter,
				TransitionState.Entered,
				// the Entered state is currently seen twice, once
				// in the next tick after 'WillEnter' and then again
				// once the entry transition completes
				TransitionState.Entered
			]);
		});
	});
});

addTest('should invoke callback when component is removed', assert => {
	return runReactTest(element => {
		let componentRemoved = Q.defer<void>();

		// render container with child
		let renderContainer = (withChild: boolean) => {
			render(TransitionContainerF({
				onComponentRemoved: key => {
					assert.equal(key, 'child');
					componentRemoved.resolve(null);
				}
			}, withChild ? ChildF({ key: 'child' }) : null), element);
		}

		// re-render without child and verify that the onComponentRemoved()
		// callback is invoked
		renderContainer(true);
		setTimeout(() => renderContainer(false), 10);

		return componentRemoved.promise;
	});
});
