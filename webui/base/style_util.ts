var TRANSITION_SCALE_FACTOR = 1.0;

function cssPropName(name: string) {
    // adapted from React's hyphenate.js
    var uppercasePattern = /([A-Z])/g;
    return name.replace(uppercasePattern, '-$1').toLowerCase();
}

/** Given a map of (property name -> transition duration), returns
  * a CSS property string for the 'transition' property which animates
  * each property using the specified durations.
  *
  * The durations are all scaled by TRANSITION_SCALE_FACTOR,
  * which provides an easy way to scale the duration
  * of all transitions created using this function.
  */
export function transitionOn(props: { [prop: string]: number }) {
	return Object.keys(props).map((prop) => {
		var delay = props[prop] * TRANSITION_SCALE_FACTOR;
		return cssPropName(prop) + ' ' + delay.toString() + 's ease-out';
	}).join(', ');
}

