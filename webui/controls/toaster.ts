/// <reference path="../../typings/react-0.12.d.ts" />

import react = require('react');
import typed_react = require('typed-react');

import div = require('../base/div');
import reactutil = require('../base/reactutil');
import theme = require('../theme');

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

