import colors = require('./colors');

// Color of floating label and underline when focused
export var focusColor = colors.MATERIAL_COLOR_PRIMARY;

// Color of label when unfocused
export var labelColor = colors.MATERIAL_GREY_P500;

var transitionDuration = '0.2s';
var textMargin = '0.5em 0 0.25em';

export var styles = {
	normalTextFieldStyle: {
		background: 'transparent',
		fontSize: 16,
		border: 'none',
		outline: 'none',
		left: 0,
		width: '100%',
		padding: 0,
		margin: textMargin
	},

	underlineContainerStyle: {
		position: 'relative',
		left: 0,
		right: 0,
		height: 0,
		overflow: 'visible'
	},

	underlineStyle: {
		backgroundColor: labelColor,
		height: 1
	},

	// style used for the underline when the input
	// has focus
	focusedUnderlineStyle: {
		backgroundColor: focusColor,
		height: 2,
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		opacity: 0,
		transition: 'left ' + transitionDuration + ' ease-out, right ' + transitionDuration + ' ease-out'
	},

	errorUnderlineStyle: {
		backgroundColor: colors.MATERIAL_RED_P400
	},

	fullWidthTextFieldStyle: {
		width: '100%'
	},

	placeHolderStyling: {
		color: labelColor,
		fontSize: 16,
		left: 1,
		position: 'absolute',
		opacity: 1,
		transition: 'top .18s linear, font-size .18s linear, opacity .10s linear',
		pointerEvents: 'none',
		margin: textMargin
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
		backgroundColor: labelColor,
		bottom: 6,
		height: 3,
		opacity: 0,
		position: 'absolute',
		transition: 'opacity .28s linear',
		width: 3,
		':before': {
			backgroundColor: labelColor,
			bottom: 0,
			content: "''",
			position: 'absolute',
			height: 3,
			width: 3,
			right: 6
		},
		':after': {
			backgroundColor: labelColor,
			bottom: 0,
			content: "''",
			position: 'absolute',
			height: 3,
			width: 3,
			right: -6
		}
	},

	focusStyle: {
		backgroundColor: focusColor,
		':before': {
			backgroundColor: focusColor
		},
		':after': {
			backgroundColor: focusColor
		}
	}
}

