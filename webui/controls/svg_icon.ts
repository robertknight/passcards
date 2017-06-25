import react = require('react');
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

export function SvgIcon(props: SvgIconProps) {
    var fillAttr = underscore.escape(props.fill);
    var hrefAttr = underscore.escape(props.href);
    var viewBox = props.viewBox;

    return react.DOM.svg(
        reactutil.mergeProps(props, {
            dangerouslySetInnerHTML: {
                __html: `<use x="0" y="0" fill="${fillAttr}" xlink:href="${hrefAttr}"></use>`,
            },
            viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
            width: props.width,
            height: props.height,
        })
    );
}

export var SvgIconF = react.createFactory(SvgIcon);
