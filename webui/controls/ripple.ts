/// <reference path="../../typings/react-0.12.d.ts" />

import react = require('react');
import sprintf = require('sprintf');
import style = require('ts-style');
import typed_react = require('typed-react');

import div = require('../base/div');
import theme = require('../theme');
import reactutil = require('../base/reactutil');

export interface InkRippleProps {
	color: {
		r: number;
		g: number;
		b: number;
	};
}

export interface InkRippleState {
	startX?: number;
	startY?: number;
	active?: boolean;
	width?: number;
	height?: number;
}

/** InkRipple provides a Material Design-style ripple effect when touched or clicked.
  *
  * To use an InkRipple, add it as the child of the element which should display
  * the effect when touched. The ripple will expand to fill its positioned parent.
  */
export class InkRipple extends typed_react.Component<InkRippleProps, InkRippleState> {
	private anim : {
		startTime: number;
		context: CanvasRenderingContext2D;
	};

	getInitialState() {
		return {
			startX: 0,
			startY: 0,
			active: false,
			width: 500,
			height: 500
		};
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

			canvas.width = container.offsetWidth;
			canvas.height = container.offsetHeight;

			this.setState({
				active: true,
				startX: x,
				startY: y,
			});

			this.anim = {
				startTime: Date.now(),
				context: canvas.getContext('2d')
			};
			this.stepAnimation();
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
				ref: 'canvas',
				width: this.state.width,
				height: this.state.height
			})
		)
	}

	private stepAnimation() {
		if (!this.isMounted()) {
			// component was unmounted during
			// animation
			return;
		}

		var duration = 500;
		var elapsed = Date.now() - this.anim.startTime;
		var radius = elapsed / 3.0;
		var ctx = this.anim.context;

		var alpha = 0.7 - (elapsed / duration);
		var elem = <HTMLCanvasElement>(this.refs['container'].getDOMNode());

		ctx.clearRect(0,0, elem.offsetWidth, elem.offsetHeight);
		ctx.fillStyle = sprintf('rgba(%d,%d,%d,%f)',
		  this.props.color.r, this.props.color.g, this.props.color.b,
		  alpha);
		ctx.beginPath();
		ctx.arc(this.state.startX, this.state.startY, radius, 0, Math.PI * 2, true);
		ctx.fill();

		if (elapsed < duration) {
			window.requestAnimationFrame(() => {
				this.stepAnimation();
			});
		}
	}
}
export var InkRippleF = reactutil.createFactory(InkRipple);

