import react = require('react');
import typed_react = require('typed-react');
import underscore = require('underscore');

import reactutil = require('../base/reactutil');

export interface SvgIconProps extends react.HTMLAttributes<Element> {
	// redeclare 'ref' here to resolve conflict between
	// react.Props.ref and react.HTMLAttributes.ref
	ref?: string;

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
		var fillAttr = underscore.escape(this.props.fill);
		var hrefAttr = underscore.escape(this.props.href);
		var viewBox = this.props.viewBox;

		return react.DOM.svg(reactutil.mergeProps(this.props, {
			dangerouslySetInnerHTML: {
				__html: `<use x="0" y="0" fill="${fillAttr}" xlink:href="${hrefAttr}"></use>`,
			},
			viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
			width: this.props.width,
			height: this.props.height
		}));
	}
}

export var SvgIconF = reactutil.createFactory(SvgIcon);
