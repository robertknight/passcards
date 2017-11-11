import react = require('react');
import react_dom = require('react-dom');
import style = require('ts-style');

import button = require('./controls/button');
import colors = require('./controls/colors');
import { div } from './base/dom_factory';
import browser_access = require('./browser_access');
import password_gen = require('../lib/password_gen');
import text_field = require('./controls/text_field');

export enum FieldType {
    Text,
    Password,
    Url,
}

interface ItemFieldState {
    selected?: boolean;
    revealed?: boolean;
    value?: string;
}

export interface ItemFieldProps extends react.Props<void> {
    label: string;
    value: string;
    type: FieldType;
    clipboard: browser_access.ClipboardAccess;
    readOnly: boolean;

    // if true, auto-focus the field on load
    focused?: boolean;

    deleteLabel?: string;

    onChangeLabel?(newValue: string): boolean;
    onChange(newValue: string): boolean;
    onDelete?(): void;
}

let theme = style.create(
    {
        field: {
            display: 'flex',
            flexDirection: 'column',
            paddingRight: 20,
            maxWidth: 300,

            actions: {
                display: 'flex',
                flexDirection: 'row',
                order: 3,
                justifyContent: 'center',
            },
        },
    },
    __filename
);

export class ItemField extends react.Component<ItemFieldProps, ItemFieldState> {
    private focusListener: EventListener;

    constructor(props: ItemFieldProps) {
        super(props);

        this.state = {
            selected: false,
            revealed: false,
            value: this.props.value,
        };
    }

    componentWillReceiveProps(nextProps: ItemFieldProps) {
        if (this.props.value !== nextProps.value || nextProps.readOnly) {
            this.setState({ value: nextProps.value });
        }
    }

    componentDidMount() {
        var field = <HTMLElement>react_dom.findDOMNode(this.refs['itemField']);
        this.focusListener = (e: FocusEvent) => {
            let focusedElement = <HTMLElement>e.target;
            let isSelected = this.state.selected;
            this.setState({
                selected:
                    field.contains(focusedElement) ||
                    (isSelected && focusedElement.contains(field)),
            });
        };
        field.ownerDocument.addEventListener(
            'focus',
            this.focusListener,
            true /* useCapture - non-capture focus events do not bubble */
        );
    }

    componentWillUnmount() {
        var field = react_dom.findDOMNode(this.refs['itemField']);
        field.ownerDocument.removeEventListener(
            'focus',
            this.focusListener,
            true /* useCapture */
        );
        this.focusListener = null;
    }

    render() {
        var displayValue = this.state.value;
        var inputType = 'text';
        if (this.props.type == FieldType.Password && !this.state.revealed) {
            inputType = 'password';
        }
        if (this.props.type == FieldType.Url) {
            inputType = 'url';
        }

        var actions: react.ReactElement<{}>[] = [];
        if (this.state.selected) {
            var copyButton: react.ReactElement<button.ButtonProps>;
            if (this.props.clipboard.clipboardAvailable()) {
                copyButton = button.ButtonF({
                    style: button.Style.Rectangular,
                    value: 'Copy',
                    key: 'copy',
                    onClick: e => {
                        this.props.clipboard.copy(
                            'text/plain',
                            this.props.value
                        );
                    },
                });
            }
            actions.push(copyButton);

            if (this.props.type == FieldType.Password) {
                var revealButton = button.ButtonF({
                    style: button.Style.Rectangular,
                    value: this.state.revealed ? 'Hide' : 'Reveal',
                    key: 'reveal',
                    onClick: e => {
                        e.preventDefault();
                        this.setState({ revealed: !this.state.revealed });
                    },
                });
                actions.push(revealButton);

                if (!this.props.readOnly) {
                    var generateButton = button.ButtonF({
                        style: button.Style.Rectangular,
                        color: colors.MATERIAL_COLOR_PRIMARY,
                        value: 'Generate',
                        key: 'generate',
                        onClick: e => {
                            var newPassword = password_gen.generatePassword(12);
                            this.setState({ revealed: true });
                            this.props.onChange(newPassword);
                        },
                    });
                    actions.push(generateButton);
                }
            }
        }

        if (
            this.state.selected &&
            !this.props.readOnly &&
            this.props.onDelete
        ) {
            var deleteButton = button.ButtonF({
                style: button.Style.Rectangular,
                value: this.props.deleteLabel || 'Delete',
                key: 'delete',
                color: colors.MATERIAL_RED_P500,
                onClick: e => {
                    e.preventDefault();
                    this.props.onDelete();
                },
            });
            actions.push(deleteButton);
        }

        var fieldStyle: text_field.TextFieldStyle = {};
        if (this.props.type == FieldType.Password) {
            fieldStyle.fontFamily = 'monospace';
        }

        var focusField = this.props.focused;
        var labelEditor: react.ReactElement<text_field.TextFieldProps>;
        if (this.props.onChangeLabel) {
            labelEditor = text_field.TextFieldF({
                floatingLabel: true,
                placeHolder: 'Field Title',
                onChange: e => {
                    var newValue = (<HTMLInputElement>e.target).value;
                    this.props.onChangeLabel(newValue);
                },
                focus: focusField,
            });

            // when editing the label, autofocus the label editor,
            // not the field value
            focusField = false;
        }

        return div(
            style.mixin(theme.field, { ref: 'itemField' }),
            labelEditor,
            text_field.TextFieldF({
                floatingLabel: this.props.onChangeLabel == null,
                placeHolder: this.props.label,
                value: displayValue,
                type: inputType,
                onChange: e => {
                    var newValue = (<HTMLInputElement>e.target).value;
                    this.setState({ value: newValue });
                    this.props.onChange(newValue);
                },
                readOnly: this.props.readOnly,
                showUnderline: !this.props.readOnly,
                style: fieldStyle,
                focus: focusField,
                ref: 'textField',
            }),
            div(style.mixin(theme.field.actions), actions)
        );
    }
}

export let ItemFieldF = react.createFactory(ItemField);
