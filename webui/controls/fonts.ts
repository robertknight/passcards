// see http://www.google.com/design/spec/style/typography.html

var weights = {
	LIGHT: 300,
	REGULAR: 400,
	MEDIUM: 500
};

var fonts = {
	FAMILY: 'RobotoDraft, Roboto, "Helvetica Neue", sans-serif',

	display4: {
		weight: weights.LIGHT,
		size: 112
	},

	display3: {
		weight: weights.REGULAR,
		size: 56
	},

	display2: {
		weight: weights.REGULAR,
		size: 45
	},

	display1: {
		weight: weights.REGULAR,
		size: 34
	},

	headline: {
		weight: weights.REGULAR,
		size: 24
	},

	title: {
		weight: weights.MEDIUM,
		size: 20
	},

	subhead: {
		weight: weights.REGULAR,
		size: 16
	},

	body2: {
		weight: weights.MEDIUM,
		size: 14
	},

	body1: {
		weight: weights.REGULAR,
		size: 14
	},

	caption: {
		weight: weights.REGULAR,
		size: 12
	},

	button: {
		weight: weights.MEDIUM,
		size: 14
	},

	itemPrimary: {
		weight: weights.REGULAR,
		size: 15
	},

	itemSecondary: {
		weight: weights.REGULAR,
		size: 13
	}
};

export = fonts;
