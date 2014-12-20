/// <reference path="../../typings/react-0.12.d.ts" />

import react = require('react');
import sprintf = require('sprintf');
import style = require('ts-style');
import typed_react = require('typed-react');

import div = require('../base/div');
import theme = require('../theme');
import reactutil = require('../base/reactutil');

enum Phase {
	Idle,
	Touch,
	Release
}

export interface InkRippleProps {
	color: {
		r: number;
		g: number;
		b: number;
	};
	children?: React.ReactElement<any>[];
}

export interface InkRippleState {
	startX?: number;
	startY?: number;
	active?: boolean;

	phase?: Phase;
	animStartTime?: number;
	phaseStartTime?: number;
}

/** InkRipple provides a Material Design-style ripple effect when touched or clicked.
  *
  * To use an InkRipple, add it as the child of the element which should display
  * the effect when touched. The ripple will expand to fill its positioned parent.
  */
export class InkRipple extends typed_react.Component<InkRippleProps, InkRippleState> {
	private anim : {
		context: CanvasRenderingContext2D;
	};

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
		var canvas = <HTMLCanvasElement>(this.refs['canvas'].getDOMNode());
		var container = <HTMLElement>(this.refs['container'].getDOMNode());
		var parentNode = <HTMLElement>(container.parentNode);
		parentNode.addEventListener('mousedown', (e: MouseEvent) => {
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
		});

		parentNode.addEventListener('mouseup', (e: MouseEvent) => {
			if (this.state.phase === Phase.Touch) {
				this.setState({phase: Phase.Release});
			}
		});
	}

	componentDidUnmount() {
		this.anim = null;
	}

	render() {
		return div(theme.inkRipple, {
			ref: 'container',
			style : {
				width: '100%',
				height: '100%',
				overflow: 'hidden'
			}
		},
			react.DOM.canvas({
				className: style.classes(theme.inkRipple),
				ref: 'canvas'
			}),
			div(theme.inkRipple.container, {}, this.props.children)
		)
	}

	private updateCanvasSize() {
		var canvas = <HTMLCanvasElement>(this.refs['canvas'].getDOMNode());
		var container = <HTMLElement>(this.refs['container'].getDOMNode());
		canvas.width = container.offsetWidth;
		canvas.height = container.offsetHeight;
	}

	private stepAnimation() {
		if (!this.isMounted() || this.state.phase === Phase.Idle) {
			// component was unmounted or lost focus during
			// animation
			return;
		}

		this.updateCanvasSize();

		var MAX_TOUCH_EXPAND_DURATION = 800;
		var EXPAND_PX_PER_MS = 0.2;
		var PHASE_DURATION = 300;

		var elapsed = Date.now() - this.state.animStartTime;
		var phaseElapsed = Date.now() - this.state.phaseStartTime;
		var radius = 0;
		if (this.state.phase === Phase.Touch) {
			radius = Math.min(phaseElapsed, MAX_TOUCH_EXPAND_DURATION) * EXPAND_PX_PER_MS;
		} else if (this.state.phase === Phase.Release) {
			var expandPhaseDuration = Math.min(elapsed, MAX_TOUCH_EXPAND_DURATION);
			radius = (expandPhaseDuration + phaseElapsed) * EXPAND_PX_PER_MS;
		}

		var rippleAlpha = 0.9;
		if (this.state.phase == Phase.Release) {
			rippleAlpha -= phaseElapsed / PHASE_DURATION;
		}

		var elem = <HTMLCanvasElement>(this.refs['container'].getDOMNode());
		var ctx = this.anim.context;
		ctx.clearRect(0,0, elem.offsetWidth, elem.offsetHeight);
		ctx.fillStyle = sprintf('rgba(%d,%d,%d,%f)',
		  this.props.color.r, this.props.color.g, this.props.color.b,
		  rippleAlpha);
		ctx.beginPath();
		ctx.arc(this.state.startX, this.state.startY, radius, 0, Math.PI * 2, true);
		ctx.fill();

		if (phaseElapsed < PHASE_DURATION) {
			window.requestAnimationFrame(() => {
				this.stepAnimation();
			});
		} else if (this.state.phase === Phase.Release) {
			this.setState({phase: Phase.Idle});
		}
	}
}
export var InkRippleF = reactutil.createFactory(InkRipple);

