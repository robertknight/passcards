/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />
/// <reference path="../typings/dom.d.ts" />

// Re-usable UI controls that are used in different parts
// of the front-end

import react = require('react');
import reactts = require('react-typescript');
import sprintf = require('sprintf');
import underscore = require('underscore');

import reactutil = require('./reactutil');

export class ToolbarButtonProps {
	iconHref: string;
}

export class ToolbarButton extends reactts.ReactComponentBase<ToolbarButtonProps,{}> {
	render() {
		return react.DOM.a(reactutil.mergeProps(this.props, {
			className: 'toolbarLink',
			href: '#',
		}),
		new SvgIcon({
			href: this.props.iconHref,
			width: 20,
			height: 20,
			fill: 'white',
			viewBox: {x: 0, y: 0, width: 22, height: 22}
		}));
	}
}

export class SvgIconProps {
	href: string;
	fill: string;
	viewBox: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	width: number;
	height: number;
}

export class SvgIcon extends reactts.ReactComponentBase<SvgIconProps, {}> {
	render() {
		return react.DOM.svg(reactutil.mergeProps(this.props, {
			dangerouslySetInnerHTML: {
				__html: sprintf('<use x="0" y="0" fill="%s" xlink:href="%s"></use>',
				  underscore.escape(this.props.fill), underscore.escape(this.props.href))
			},
			viewBox: sprintf('%d %d %d %d', this.props.viewBox.x, this.props.viewBox.y,
			  this.props.viewBox.width, this.props.viewBox.height),
			width: this.props.width,
			height: this.props.height
		}));
	}
}

export interface ActionButtonProps {
	value: string;
	onClick: (e: MouseEvent) => void;
}

export class ActionButton extends reactts.ReactComponentBase<ActionButtonProps,{}> {
	componentDidMount() {
		setTimeout(() => {
			var button = <HTMLButtonElement>(this.refs['button'].getDOMNode());
			var ripple = <InkRipple>(this.refs['ripple']);
			ripple.setState({
				width: button.offsetWidth,
				height: button.offsetHeight
			});
		}, 1000);
	}

	render() {
		return react.DOM.div({
			className: 'itemActionButtonContainer'
		},
			react.DOM.input(reactutil.mergeProps(this.props, {
				className: 'itemActionButton',
				type: 'button',
				ref: 'button'
			})),
			new InkRipple({
				color: {r: 252, g: 228, b: 236},
				ref: 'ripple'
			})
		);
	}
}

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
export class InkRipple extends reactts.ReactComponentBase<InkRippleProps, InkRippleState> {
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
		return react.DOM.div({
			className: 'inkRipple',
			ref: 'container',
			style : {
				width: '100%',
				height: '100%',
				overflow: 'hidden'
			}
		},
			react.DOM.canvas({
				className: 'inkRipple',
				ref: 'canvas',
				width: this.state.width,
				height: this.state.height
			})
		)
	}

	private stepAnimation() {
		if (!this.anim) {
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
			window.requestAnimationFrame(this.stepAnimation.bind(this));
		}
	}
}

export interface ToasterProps {
	message: string;
	progressValue: number;
	progressMax: number;
}

/** Control for displaying a temporary notification,
  * with an optional progress indicator.
  */
export class Toaster extends reactts.ReactComponentBase<ToasterProps, {}> {
	render() {
		var PROGRESS_WIDTH = 200;
		var meterWidth = (this.props.progressValue / this.props.progressMax) * PROGRESS_WIDTH;

		return react.DOM.div({className: 'toaster'},
			react.DOM.div({className: 'toasterMessage'},
				this.props.message
			),
			react.DOM.div({
				className: 'toasterProgress',
				style: {
					width: PROGRESS_WIDTH + 'px'
				}
			},
				react.DOM.div({
					className: 'toasterProgressMeter',
					style: { width: meterWidth + 'px' }
				})
			)
		);
	}
}


