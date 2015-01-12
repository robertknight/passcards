/// <reference path="../../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');
import style = require('ts-style');

import div = require('../base/div');
import reactutil = require('../base/reactutil');
import controls_theme = require('./theme');

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

export interface ToasterProps {
	message: string;
	progressValue?: number;
	progressMax?: number;
}

/** Control for displaying a temporary notification,
  * with an optional progress indicator.
  */
export class Toaster extends typed_react.Component<ToasterProps, {}> {
	render() {
		var PROGRESS_WIDTH = 200;
		var meterWidth = (this.props.progressValue / this.props.progressMax) * PROGRESS_WIDTH;

		var progressBar: React.ReactElement<any>;
		if (this.props.progressMax) {
			progressBar = div(theme.toaster.progressBar.outline, {
					style: {
						width: PROGRESS_WIDTH + 'px'
					}
				},
				div(theme.toaster.progressBar.meter, {
					style: { width: meterWidth + 'px' }
				})
			);
		}

		return div(theme.toaster, {},
			react.DOM.div({},
				this.props.message
			),
			progressBar
		);
	}
}

export var ToasterF = reactutil.createFactory(Toaster);

