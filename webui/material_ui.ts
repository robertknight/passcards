import react = require('react');

// TODO - Upstream typings into react-material
export interface TextFieldProps {
	floatingLabel?: boolean;
	placeHolder?: string;

	concealed?: boolean;
	initialValue?: string;
}

var TextField = require('react-material/components/TextField');
export var TextFieldF: React.Factory<TextFieldProps> = react.createFactory(TextField);
