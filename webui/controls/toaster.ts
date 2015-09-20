/// <reference path="../../typings/react.d.ts" />

import react = require('react');
import typed_react = require('typed-react');
import style = require('ts-style');

import reactutil = require('../base/reactutil');
import controls_theme = require('./theme');
import style_util = require('../base/style_util');
import transition_mixin = require('../base/transition_mixin');

var theme = style.create({
	toaster: {
		fontSize: 12,
		position: 'fixed',
		zIndex: controls_theme.Z_LAYERS.TOASTER,
		bottom: 5,
		backgroundColor: 'rgba(0,0,0,0.85)',
		color: 'white',
		borderRadius: 5,
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 4,
		paddingLeft: 10,
		paddingRight: 10,
		left: '50%',
		transform: 'translate(-50%)',

		transition: style_util.transitionOn({
			opacity: .3
		}),

		progressBar: {
			outline: {
				border: '1px solid white',
				borderRadius: 5,
				height: 4
			},
			meter: {
				backgroundColor: 'white',
				borderRadius: 5,
				height: 4
			}
		},

		'> *': {
			marginLeft: 2,
			marginRight: 2
		}
	}
});

export interface ToasterProps extends react.Props<void> {
	message: string;
	progressValue?: number;
	progressMax?: number;
}

interface ToasterState extends transition_mixin.CSSTransitionMixinState {
}

/** Control for displaying a temporary notification,
  * with an optional progress indicator.
  */
export class Toaster extends typed_react.Component<ToasterProps, ToasterState> {
	getInitialState() {
		return {
			transitionProperty: 'opacity'
		};
	}

	render() {
		var PROGRESS_WIDTH = 200;
		var meterWidth = (this.props.progressValue / this.props.progressMax) * PROGRESS_WIDTH;

		var progressBar: react.ReactElement<any>;
		if (this.props.progressMax) {
			progressBar = react.DOM.div(style.mixin([theme.toaster.progressBar.outline, {
				width: PROGRESS_WIDTH + 'px'
			}]),
				react.DOM.div(style.mixin([theme.toaster.progressBar.meter, {
					width: meterWidth + 'px'
				}]))
				);
		}

		var transitionStyle = transition_mixin.fadeIn(this.state.transition);
		return react.DOM.div(style.mixin([theme.toaster, transitionStyle], {}),
			react.DOM.div({},
				this.props.message
				),
			progressBar
			);
	}
}

export var ToasterF = reactutil.createFactory(Toaster, transition_mixin.CSSTransitionMixinM);
