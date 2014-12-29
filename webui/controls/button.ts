import react = require('react');
import style = require('ts-style');
import typed_react = require('typed-react');

import div = require('../base/div');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');
import theme = require('../theme');

export interface ButtonProps {
	value: string;
	onClick: (e: React.MouseEvent) => void;

	backgroundColor?: string;
}

export class Button extends typed_react.Component<ButtonProps,{}> {
	componentDidMount() {
		setTimeout(() => {
			if (!this.isMounted()) {
				return;
			}

			var button = <HTMLElement>(this.getDOMNode());
			var ripple = <ripple.InkRipple>(this.refs['ripple']);
			ripple.setState({
				width: button.offsetWidth,
				height: button.offsetHeight
			});
		}, 1000);
	}

	render() {
		var buttonStyles = [theme.button.button];

		return div(theme.button.container, {role: 'button'},
			react.DOM.div(style.mixin(theme.button.rippleContainer, {
				onClick: (e: React.MouseEvent) => this.props.onClick(e)
			}),
				ripple.InkRippleF({radius: 100, ref: 'ripple'}),
				react.DOM.div(style.mixin(buttonStyles, {}), this.props.value)
			)
		);
	}
}

export var ButtonF = reactutil.createFactory(Button);

