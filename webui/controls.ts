/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />

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
	render() {
		return react.DOM.input(reactutil.mergeProps(this.props, {
			className: 'itemActionButton',
			type: 'button'
		}));
	}
}

