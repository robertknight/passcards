/// <reference path="../../typings/react.d.ts" />

// Material Design style touch-ripple.
// See https://www.polymer-project.org/docs/elements/paper-elements.html#paper-ripple 

import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import reactutil = require('../base/reactutil');

var theme = style.create({
	inkRipple: {
		overflow: 'hidden',
		position: 'absolute',
		left: 0,
		top: 0,
		WebkitTapHighlightColor: 'transparent',
		/* the ripple listens for mouse events on the parent
		 * element itself.
		 */
		pointerEvents: 'none',
		width: '100%',
		height: '100%',

		container: {
			// layout the child elements in their own stacking context so
			// that they appear on top of the ripple effect
			position: 'relative',
			zIndex: 0
		}
	},
});

enum Phase {
	Idle,
	Touch,
	Release
}

export interface InkRippleProps {
	/** Fill style for the expanding ripple.
	  * The background of the ripple uses a lighter version of
	  * this color.
	  */
	color?: string;
	/** Max radius the wave ripple can reach during the touch-down phase */
	radius?: number;
	children?: react.ReactElement<any>[];
}

interface InkRippleState {
	startX?: number;
	startY?: number;
	active?: boolean;

	phase?: Phase;
	animStartTime?: number;
	phaseStartTime?: number;
}

// ease-out function taken from Polmer's <paper-ripple> component
function easeOut(max: number, value: number) {
	return max * (1 - Math.pow(80, -value));
}

/** InkRipple provides a Material Design-style ripple effect when touched or clicked.
  *
  * To use an InkRipple, add it as the child of the element which should display
  * the effect when touched. The ripple will expand to fill its positioned parent.
  */
export class InkRipple extends typed_react.Component<InkRippleProps, InkRippleState> {
	private anim: {
		context: CanvasRenderingContext2D;
	};

	getDefaultProps() {
		return {
			color: '#000',
			radius: 240
		};
	}

	getInitialState() {
		return {
			startX: 0,
			startY: 0,
			active: false,
			phase: Phase.Idle
		};
	}

	componentDidUpdate(prevProps: InkRippleProps, prevState: InkRippleState) {
		if (this.state.phase !== prevState.phase && this.state.phase !== Phase.Idle) {
			var now = Date.now();
			var animStartTime = this.state.animStartTime;
			if (prevState.phase === Phase.Idle) {
				animStartTime = now;
			}
			this.setState({
				animStartTime: animStartTime,
				phaseStartTime: now
			}, () => {
					this.stepAnimation();
				});
		}
	}

	componentDidMount() {
		// start the ripple on touch where supported or mousedown
		// otherwise
		var parentNode = <HTMLElement>(this.getDOMNode().parentNode);

		parentNode.addEventListener('mousedown', this.onTouchStart);
		parentNode.addEventListener('touchstart', this.onTouchStart);

		parentNode.addEventListener('mouseup', this.onTouchEnd);
		parentNode.addEventListener('mouseleave', this.onTouchEnd);
		parentNode.addEventListener('touchend', this.onTouchEnd);
	}

	componentWillUnmount() {
		this.anim = null;

		var parentNode = <HTMLElement>(this.getDOMNode().parentNode);

		parentNode.removeEventListener('mousedown', this.onTouchStart);
		parentNode.removeEventListener('touchstart', this.onTouchStart);

		parentNode.removeEventListener('mouseup', this.onTouchEnd);
		parentNode.removeEventListener('mouseleave', this.onTouchEnd);
		parentNode.removeEventListener('touchend', this.onTouchEnd);
	}

	private onTouchStart(e: MouseEvent) {
		var canvas = <HTMLCanvasElement>(react.findDOMNode(this.refs['canvas']));

		if (this.state.phase !== Phase.Idle) {
			return;
		}

		var cx = canvas.getBoundingClientRect().left;
		var cy = canvas.getBoundingClientRect().top;

		var ex: number;
		var ey: number;

		var touchEvent = <TouchEvent>(<Event>e);
		if (touchEvent.touches) {
			ex = touchEvent.touches[0].pageX;
			ey = touchEvent.touches[0].pageY;
		} else {
			ex = e.pageX;
			ey = e.pageY;
		}

		var x = ex - (window.pageXOffset + cx);
		var y = ey - (window.pageYOffset + cy);

		this.updateCanvasSize();

		this.anim = {
			context: canvas.getContext('2d')
		};
		this.setState({
			active: true,
			startX: x,
			startY: y,
			phase: Phase.Touch
		});
	}

	private onTouchEnd(e: MouseEvent) {
		if (this.state.phase === Phase.Touch) {
			this.setState({ phase: Phase.Release });
		}
	}

	render() {
		return react.DOM.div(style.mixin(theme.inkRipple, { ref: 'container' }),
			react.DOM.canvas({
				className: style.classes(theme.inkRipple),
				ref: 'canvas'
			}),
			react.DOM.div(style.mixin(theme.inkRipple.container), this.props.children)
			)
	}

	private updateCanvasSize() {
		var canvas = <HTMLCanvasElement>(react.findDOMNode(this.refs['canvas']));
		var container = <HTMLElement>(react.findDOMNode(this.refs['container']));
		canvas.width = container.clientWidth;
		canvas.height = container.clientHeight;
	}

	private stepAnimation() {
		if (!this.isMounted() || this.state.phase === Phase.Idle) {
			// component was unmounted or lost focus during
			// animation
			return;
		}

		this.updateCanvasSize();

		// max time for which the ripple can expand during the
		// touch-down phase
		var TOUCH_PHASE_DURATION = 800;
		// duration of the wave fade-out during the touch-up phase
		var RELEASE_PHASE_DURATION = 500;

		var elapsed = Date.now() - this.state.animStartTime;
		var phaseElapsed = Date.now() - this.state.phaseStartTime;

		var touchDuration = Math.min(elapsed, TOUCH_PHASE_DURATION);
		var maxDuration = TOUCH_PHASE_DURATION + RELEASE_PHASE_DURATION;
		var rippleDuration = touchDuration;

		if (this.state.phase === Phase.Release) {
			rippleDuration += phaseElapsed;
		}

		var radius = easeOut(this.props.radius, rippleDuration / maxDuration);

		var MAX_BACKGROUND_ALPHA = 0.2;
		var backgroundAlpha = Math.min((elapsed / 500.0) * MAX_BACKGROUND_ALPHA, MAX_BACKGROUND_ALPHA);

		var rippleAlpha = 0.17;
		if (this.state.phase == Phase.Release) {
			// fade-out ripple after release
			rippleAlpha *= 1 - (phaseElapsed / RELEASE_PHASE_DURATION);
			backgroundAlpha *= 1 - (phaseElapsed / RELEASE_PHASE_DURATION);
		}

		var elem = <HTMLCanvasElement>(react.findDOMNode(this.refs['container']));
		var ctx = this.anim.context;
		ctx.clearRect(0, 0, elem.offsetWidth, elem.offsetHeight);
		ctx.fillStyle = this.props.color;

		// render background
		ctx.globalAlpha = backgroundAlpha;
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		// render ripple wave
		ctx.fillStyle = this.props.color;
		ctx.globalAlpha = rippleAlpha;
		ctx.beginPath();
		ctx.arc(this.state.startX, this.state.startY, radius, 0, Math.PI * 2, true);
		ctx.fill();

		var phaseDuration = this.state.phase === Phase.Touch ? TOUCH_PHASE_DURATION : RELEASE_PHASE_DURATION;
		if (phaseElapsed < phaseDuration) {
			reactutil.requestAnimationFrame(() => {
				this.stepAnimation();
			});
		} else if (this.state.phase === Phase.Release) {
			ctx.clearRect(0, 0, elem.offsetWidth, elem.offsetHeight);
			this.setState({ phase: Phase.Idle });
		}
	}
}
export var InkRippleF = reactutil.createFactory(InkRipple);

