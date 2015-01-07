import react = require('react');
import sprintf = require('sprintf');
import typed_react = require('typed-react');
import underscore = require('underscore');

import reactutil = require('../base/reactutil');

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

export class SvgIcon extends typed_react.Component<SvgIconProps, {}> {
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

export var SvgIconF = reactutil.createFactory(SvgIcon);

