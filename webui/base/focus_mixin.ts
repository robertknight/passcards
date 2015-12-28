
import react = require('react');
import typed_react = require('typed-react');

export interface FocusMixinProps {
	focus: boolean;
}

interface Focusable {
	setFocus? (): void;
}

export class FocusMixin extends typed_react.Mixin<FocusMixinProps, {}> {

	private focusElement() {
		var focusable = <Focusable>this;
		if (focusable.setFocus) {
			focusable.setFocus();
		} else {
			(<HTMLElement>react.findDOMNode(this)).focus();
		}
	}

	componentDidMount() {
		if (this.props.focus) {
			this.focusElement();
		}
	}

	componentDidUpdate(prevProps: FocusMixinProps) {
		if (!prevProps.focus && this.props.focus) {
			this.focusElement();
		}
	}
}

export var FocusMixinM = typed_react.createMixin(FocusMixin);

