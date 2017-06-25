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
import react_dom = require('react-dom');
import style = require('ts-style');

import { div, input } from '../base/dom_factory';
import colors = require('./colors');
import fonts = require('./fonts');

// Color of floating label and underline when focused
var FOCUS_COLOR = colors.MATERIAL_COLOR_PRIMARY;

// Color of label when unfocused
var LABEL_COLOR = colors.MATERIAL_GREY_P500;

var TRANSITION_DURATION = '0.2s';
var TEXT_MARGIN = '0.5em 0 0.25em';

var theme = style.create(
    {
        textField: {
            normalTextFieldStyle: {
                background: 'transparent',
                fontSize: 16,
                border: 'none',
                outline: 'none',
                left: 0,
                width: '100%',
                padding: 0,
                margin: TEXT_MARGIN,
            },

            underlineContainer: {
                position: 'relative',
                left: 0,
                right: 0,
                height: 0,
                overflow: 'visible',
            },

            underline: {
                backgroundColor: LABEL_COLOR,
                height: 1,
            },

            // style used for the underline when the input
            // has focus
            focusedUnderline: {
                backgroundColor: FOCUS_COLOR,
                height: 2,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                opacity: 0,
                transition:
                    'left ' +
                        TRANSITION_DURATION +
                        ' ease-out, right ' +
                        TRANSITION_DURATION +
                        ' ease-out',
            },

            errorUnderline: {
                backgroundColor: colors.MATERIAL_RED_P500,
            },

            errorLabel: {
                color: colors.MATERIAL_RED_P500,
                fontSize: fonts.caption.size,
                marginTop: 8,
            },

            fullWidthTextFieldStyle: {
                width: '100%',
            },

            placeholder: {
                color: LABEL_COLOR,
                fontSize: 16,
                left: 1,
                position: 'absolute',
                opacity: 1,
                transition:
                    'top .18s linear, font-size .18s linear, opacity .10s linear',
                pointerEvents: 'none',
                margin: TEXT_MARGIN,
            },

            floatingLabel: {
                top: 27,

                error: {
                    color: colors.MATERIAL_RED_P500,
                },
            },

            container: {
                position: 'relative',
                paddingBottom: 8,
            },

            placeholderTop: {
                fontSize: 12,
                top: 4,
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
                    right: 6,
                },
                ':after': {
                    backgroundColor: LABEL_COLOR,
                    bottom: 0,
                    content: "''",
                    position: 'absolute',
                    height: 3,
                    width: 3,
                    right: -6,
                },
            },

            focusStyle: {
                backgroundColor: FOCUS_COLOR,
                ':before': {
                    backgroundColor: FOCUS_COLOR,
                },
                ':after': {
                    backgroundColor: FOCUS_COLOR,
                },
            },
        },
    },
    __filename
);

/** Specify custom styling for the component. */
export interface TextFieldStyle {
    fontFamily?: string;
}

export interface TextFieldProps extends react.Props<void> {
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

    /** A validation error string displayed beneath
	 * the input area.
	 */
    error?: string;

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

    onChange?: react.FormEventHandler<Element>;
    onBlur?: react.FocusEventHandler<Element>;
    onFocus?: react.FocusEventHandler<Element>;

    style?: TextFieldStyle;
}

interface TextFieldState {
    // indicates whether the input field has focus
    focus?: boolean;
    // a flag set when the user initiates focusing the
    // text field and then cleared a moment later
    focusing?: boolean;
    // the X-coordinate of the mouse event that
    // caused the field to gain focus
    focusX?: number;
}

export class TextField extends react.Component<TextFieldProps, TextFieldState> {
    private textField: HTMLInputElement;

    static defaultProps = {
        showUnderline: true,
    };

    constructor(props?: TextFieldProps) {
        super(props);

        this.state = {
            focus: false,
            focusing: true,
        };

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onFocus = this.onFocus.bind(this);
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
        var textField = <HTMLInputElement>react_dom.findDOMNode(
            this.refs['textField']
        );
        textField.select();
    }

    render() {
        var props = this.props;
        var styles = theme.textField;
        var placeHolderStyling: any[] = [styles.placeholder];

        if (props.floatingLabel) {
            placeHolderStyling.push(styles.floatingLabel);
        }

        if (this.state.focus || this.effectiveValue().length > 0) {
            if (props.floatingLabel) {
                placeHolderStyling.push(styles.placeholderTop);
                if (this.state.focus) {
                    placeHolderStyling.push({ color: FOCUS_COLOR });
                    if (this.props.error) {
                        placeHolderStyling.push(styles.floatingLabel.error);
                    }
                }
            } else {
                placeHolderStyling.push({ opacity: '0' });
            }
        }

        var containerStyling: any[] = [styles.container];
        if (props.floatingLabel) {
            containerStyling.push({ height: '66px' });
        }

        var textFieldStyling: any[] = [styles.normalTextFieldStyle];
        if (props.style && props.style.fontFamily) {
            textFieldStyling.push({ fontFamily: props.style.fontFamily });
        }

        if (props.floatingLabel) {
            textFieldStyling.push({ paddingTop: 25 });
        }

        var focusedUnderlineStyling: any[] = [styles.focusedUnderline];
        if (this.state.focus || this.props.error) {
            focusedUnderlineStyling.push({ opacity: 1 });
        }

        var errorLabel: react.ReactElement<any>;
        if (props.error) {
            focusedUnderlineStyling.push(styles.errorUnderline);
            errorLabel = div(style.mixin(styles.errorLabel), props.error);
        }

        var underline: react.ReactElement<any>;
        if (props.showUnderline) {
            underline = div(
                style.mixin(styles.underlineContainer, {
                    ref: 'underlineContainer',
                }),
                div(style.mixin(styles.underline, { ref: 'underline' })),
                div(
                    style.mixin(focusedUnderlineStyling, {
                        ref: 'focusedUnderline',
                    })
                )
            );
        }

        return div(
            style.mixin(containerStyling),
            div(style.mixin(placeHolderStyling), props.placeHolder),
            input(
                style.mixin(textFieldStyling, {
                    onChange: this.onChange,
                    onKeyUp: this.onChange,
                    onClick: this.onChange,
                    onWheel: this.onChange,
                    onFocus: this.onFocus,
                    onBlur: this.onBlur,
                    onMouseDown: this.onMouseDown,
                    onTouchStart: this.onTouchStart,
                    type: this.props.type || 'text',
                    ref: (el: HTMLInputElement) => (this.textField = el),
                    defaultValue: this.props.defaultValue,
                    value: this.props.value,
                    readOnly: this.props.readOnly,
                })
            ),
            underline,
            errorLabel
        );
    }

    onMouseDown(e: react.MouseEvent<Element>) {
        if (this.state.focus) {
            return;
        }
        this.setState({ focusX: e.clientX });
    }

    onTouchStart(e: react.TouchEvent<Element>) {
        if (this.state.focus) {
            return;
        }
        var touch = e.touches.item(0);
        this.setState({ focusX: touch.clientX });
    }

    onChange(e: react.FormEvent<Element>) {
        if (this.props.onChange) {
            this.props.onChange(e);
        }
    }

    onBlur(e: react.FocusEvent<Element>) {
        this.setState({
            focus: false,
            focusX: null,
        });
        if (this.props.onBlur) {
            this.props.onBlur(e);
        }
    }

    onFocus(e: react.FocusEvent<Element>) {
        this.setState({
            focus: true,
        });

        // if the user focused via touch or mouse,
        // animate the focused underline, spilling from the horizontal
        // position of the mouse or touch
        if (this.state.focusX && this.props.showUnderline) {
            var underlineRect = react_dom
                .findDOMNode(this.refs['underlineContainer'])
                .getBoundingClientRect();
            var focusedUnderline = <HTMLElement>react_dom.findDOMNode(
                this.refs['focusedUnderline']
            );

            this.setState({ focusing: true });

            focusedUnderline.style.transition = 'none';
            focusedUnderline.style.left =
                (this.state.focusX - underlineRect.left).toString() + 'px';
            focusedUnderline.style.right =
                (underlineRect.right - this.state.focusX).toString() + 'px';

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
        } else if (this.props.defaultValue) {
            return this.props.defaultValue;
        } else if (this.textField) {
            return this.textField.value;
        } else {
            return '';
        }
    }
}

export var TextFieldF = react.createFactory(TextField);
