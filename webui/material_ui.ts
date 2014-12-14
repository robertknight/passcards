import react = require('react');

import reactutil = require('./reactutil');
import text_field = require('./text_field');

// TODO - Upstream typings into react-material
export interface TextFieldProps {
	floatingLabel?: boolean;
	placeHolder?: string;

	concealed?: boolean;
	initialValue?: string;
}

export var TextFieldF: React.Factory<TextFieldProps> = reactutil.createFactory(text_field.TextField);
