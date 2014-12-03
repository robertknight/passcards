import testLib = require('../../lib/test');
import style = require('./style');

function stripSpaces(str: string) {
	return str.replace(/\s/g, '');
}

var styles = style.create({
	button: {
		borderRadius: 3,
		backgroundColor: 'red',

		pressed: {
			backgroundColor: 'green'
		}
	}
});

testLib.addTest('class names', (assert) => {
	assert.equal(style.classes(styles.button, styles.button.pressed),
	             'button button-pressed');
});

testLib.addTest('css generation', (assert) => {
	assert.equal(stripSpaces(style.compile(styles.button)),
	             stripSpaces('.button { border-radius: 3px; background-color: red; }' +
	                         '.button-pressed { background-color: green; }'));
});
