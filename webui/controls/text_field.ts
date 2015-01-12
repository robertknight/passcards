'use strict';

// adapted from the 'TextField' component from react-material
// See https://github.com/SanderSpies/react-material

// Text Field inputs
//
// Spec: http://www.google.com/design/spec/components/text-fields.html
//
// Single-line text fields:
//
// Without floating label:
//
//		| 16 |---
//	 48 |	 |Input Text (16sp)
//		| 16 |---
//
// With floating label:
//
//		| 16 |---
//		|	 |Label Text (12sp)
//	 72 |  8 |---
//		|	 |Input Text (16sp)
//		| 16 |---

import react = require('react');
import typed_react = require('typed-react');
import style = require('ts-style');

import colors = require('./colors');
import reactutil = require('../base/reactutil');

// Color of floating label and underline when focused
var FOCUS_COLOR = colors.MATERIAL_COLOR_PRIMARY;

// Color of label when unfocused
var LABEL_COLOR = colors.MATERIAL_GREY_P500;

var TRANSITION_DURATION = '0.2s';
var TEXT_MARGIN = '0.5em 0 0.25em';

var theme = style.create({
	textField: {
		normalTextFieldStyle: {
			background: 'transparent',
			fontSize: 16,
			border: 'none',
			outline: 'none',
			left: 0,
			width: '100%',
			padding: 0,
			margin: TEXT_MARGIN
		},

		underlineContainerStyle: {
			position: 'relative',
			left: 0,
			right: 0,
			height: 0,
			overflow: 'visible'
		},

		underlineStyle: {
			backgroundColor: LABEL_COLOR,
			height: 1
		},

		// style used for the underline when the input
		// has focus
		focusedUnderlineStyle: {
			backgroundColor: FOCUS_COLOR,
			height: 2,
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			opacity: 0,
			transition: 'left ' + TRANSITION_DURATION + ' ease-out, right ' + TRANSITION_DURATION + ' ease-out'
		},

		errorUnderlineStyle: {
			backgroundColor: colors.MATERIAL_RED_P400
		},

		fullWidthTextFieldStyle: {
			width: '100%'
		},

		placeHolderStyling: {
			color: LABEL_COLOR,
			fontSize: 16,
			left: 1,
			position: 'absolute',
			opacity: 1,
			transition: 'top .18s linear, font-size .18s linear, opacity .10s linear',
			pointerEvents: 'none',
			margin: TEXT_MARGIN
		},

		floatingLabelPlaceHolderStyling: {
			top: 27
		},

		containerStyling: {
			position: 'relative',
			paddingBottom: 8
		},

		placeHolderTopStyling: {
			fontSize: 12,
			top: 4
		},

		scrollBlocksStyle: {
			backgroundColor: LABEL_COLOR,
			bottom: 6,
			height: 3,
			opacity: 0,
			position: 'absolute',
			transition: 'opacity .28s linear',
			width: 3,
			':before': {
				backgroundColor: LABEL_COLOR,
				bottom: 0,
				content: "''",
				position: 'absolute',
				height: 3,
				width: 3,
				right: 6
			},
			':after': {
				backgroundColor: LABEL_COLOR,
				bottom: 0,
				content: "''",
				position: 'absolute',
				height: 3,
				width: 3,
				right: -6
			}
		},

		focusStyle: {
			backgroundColor: FOCUS_COLOR,
			':before': {
				backgroundColor: FOCUS_COLOR
			},
			':after': {
				backgroundColor: FOCUS_COLOR
			}
		}
	}
});

/** Specify custom styling for the component. */
export interface TextFieldStyle {
	fontFamily?: string;
}

export interface TextFieldProps {
	/** Specifies the type of <input> field */
	type?: string;

	/** Initial value of the <input> field, still allowing
	  * the user to edit it.
	  */
	defaultValue?: string;

	/** Fixed value for the <input> field. */
	value?: string;

	/** Specifies whether the placeholder text
	  * should be shown above the field when it has
	  * a value.
	  */
	floatingLabel?: boolean;

	error?: boolean;

	/** Label that is displayed in the field when empty.
	  * If floatingLabel is enabeld, this value will also float above
	  * the field's content when non-empty.
	  */
	placeHolder?: string;

	showUnderline?: boolean;
	readOnly?: boolean;

	/** Specifies whether the field should be focused when mounted
	  * or when this prop changes from false to true.
	  */
	focus?: boolean;

	onChange?: React.FormEventHandler;
	onBlur?: React.FocusEventHandler;
	onFocus?: React.FocusEventHandler;

	style?: TextFieldStyle;
}

interface TextFieldState {
	// indicates whether the input field has focus
	focus?: boolean;
	// a flag set when the user initiates focusing the
	// text field and then cleared a moment later
	focusing?: boolean;
	// the current value of the input field
	value?: string;
	// the X-coordinate of the mouse event that
	// caused the field to gain focus
	focusX?: number;
}

var div = react.DOM.div;
var input = react.DOM.input;

export class TextField extends typed_react.Component<TextFieldProps, TextFieldState> {
	getDefaultProps() {
		return {
			showUnderline: true
		};
	}

	getInitialState() {
		return {
			focus: false,
			focusing: true,
			value: ''
		};
	}

	componentDidMount() {
		if (this.props.focus) {
			this.setFocus();
		}
	}

	componentWillReceiveProps(nextProps: TextFieldProps) {
		if (!this.props.focus && nextProps.focus) {
			this.setFocus();
		}
	}

	private setFocus() {
		var textField = <HTMLInputElement>this.refs['textField'].getDOMNode();
		textField.select();
	}

	render() {
		var props = this.props;
		var styles = theme.textField;
		var textField = this.refs['textField'];
		var scrollLeft = 0;
		var scrollWidth = -1;
		var width = -1;
		var placeHolderStyling: any[] = [styles.placeHolderStyling];

		if (props.floatingLabel) {
			placeHolderStyling.push(styles.floatingLabelPlaceHolderStyling);
		}

		if (this.state.focus || this.effectiveValue().length > 0) {
			if (props.floatingLabel) {
				placeHolderStyling.push(styles.placeHolderTopStyling);
				if (this.state.focus) {
					placeHolderStyling.push({ color: FOCUS_COLOR });
				}
			} else {
				placeHolderStyling.push({ opacity: '0' });
			}
		}

		if (textField) {
			var textfieldDOMNode = <HTMLElement>textField.getDOMNode();
			scrollWidth = textfieldDOMNode.scrollWidth;
			scrollLeft = textfieldDOMNode.scrollLeft;
			width = textfieldDOMNode.offsetWidth;
		}

		var containerStyling: any[] = [styles.containerStyling];
		if (props.floatingLabel) {
			containerStyling.push({ height: '66px' });
		}

		var textFieldStyling: any[] = [styles.normalTextFieldStyle];
		if (props.style && props.style.fontFamily) {
			textFieldStyling.push({fontFamily: props.style.fontFamily});
		}

		if (props.floatingLabel) {
			textFieldStyling.push({ paddingTop: 25 });
		}

		var focusedUnderlineStyling: any[] = [styles.focusedUnderlineStyle];
		if (this.state.focus) {
			focusedUnderlineStyling.push({ opacity: 1 });
		}

		if (props.error) {
			focusedUnderlineStyling.push(styles.errorUnderlineStyle);
		}

		var underline: React.ReactElement<any>;
		if (props.showUnderline) {
			underline = div(style.mixin(styles.underlineContainerStyle, { ref: 'underlineContainer' }),
					div(style.mixin(styles.underlineStyle, { ref: 'underline' })),
					div(style.mixin(focusedUnderlineStyling, { ref: 'focusedUnderline' }))
					);
		}

		return div(style.mixin(containerStyling),
			div(style.mixin(placeHolderStyling), props.placeHolder),
			input(style.mixin(textFieldStyling, {
				onChange: this.onChange,
				onKeyUp: this.onChange,
				onClick: this.onChange,
				onWheel: this.onChange,
				onFocus: this.onFocus,
				onBlur: this.onBlur,
				onMouseDown: this.onMouseDown,
				onTouchStart: this.onTouchStart,
				type: this.props.type || 'text',
				ref: 'textField',
				defaultValue: this.props.defaultValue,
				value: this.props.value,
				readOnly: this.props.readOnly
			})),
			underline,
			div(style.mixin(
				[scrollLeft ? { opacity: '1' } : null,
					this.state.focus ? styles.focusStyle : null,
					styles.scrollBlocksStyle,
					{ left: '6px' }]
					)),
			div(style.mixin([(scrollWidth > (scrollLeft + width)) ?
					{ opacity: '1' } : null,
					this.state.focus ? styles.focusStyle : null,
					styles.scrollBlocksStyle,
					{ right: '6px' }]))
			);
	}

	onMouseDown(e: React.MouseEvent) {
		if (this.state.focus) {
			return;
		}
		this.setState({ focusX: e.clientX });
	}

	onTouchStart(e: React.TouchEvent) {
		if (this.state.focus) {
			return;
		}
		var touch = e.touches.item(0);
		this.setState({ focusX: touch.clientX });
	}

	onChange(e: React.FormEvent) {
		if (this.props.onChange) {
			this.props.onChange(e);
		}
	}

	onBlur(e: React.FocusEvent) {
		this.setState({
			focus: false,
			focusX: null
		});
		if (this.props.onBlur) {
			this.props.onBlur(e);
		}
	}

	onFocus(e: React.FocusEvent) {
		this.setState({
			focus: true
		});

		// if the user focused via touch or mouse,
		// animate the focused underline, spilling from the horizontal
		// position of the mouse or touch
		if (this.state.focusX && this.props.showUnderline) {
			var underlineRect = this.refs['underlineContainer'].getDOMNode().getBoundingClientRect();
			var focusedUnderline = <HTMLElement>this.refs['focusedUnderline'].getDOMNode();

			this.setState({ focusing: true });

			focusedUnderline.style.transition = 'none';
			focusedUnderline.style.left = (this.state.focusX - underlineRect.left).toString() + 'px';
			focusedUnderline.style.right = (underlineRect.right - this.state.focusX).toString() + 'px';

			setTimeout(() => {
				focusedUnderline.style.transition = '';
				focusedUnderline.style.left = '0px';
				focusedUnderline.style.right = '0px';

				this.setState({ focusing: false });
			}, 1);
		}

		if (this.props.onFocus) {
			this.props.onFocus(e);
		}
	}

	// returns the value being displayed in the text field.
	// This is equal to props.value if set or the current
	// value of the actual DOM node if mounted
	effectiveValue() {
		if (this.props.value !== undefined) {
			return this.props.value;
		} else if (this.isMounted()) {
			return (<HTMLInputElement>this.refs['textField'].getDOMNode()).value;
		} else {
			return '';
		}
	}
}

export var TextFieldF: React.Factory<TextFieldProps> = reactutil.createFactory(TextField);

