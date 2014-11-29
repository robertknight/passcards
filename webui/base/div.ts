import react = require('react');
import style = require('ts-style');

/** Utility function for creating a react.DOM.div() element, applying
  * CSS styles defined with style.create()
  *
  * @param div  An element from a style tree created with style.create(),
  *             or an array of such styles.
  * @param props Props passed to react.DOM.div()
  * @param children Children passed to react.DOM.div()
  */
function div(styles: any, props: React.HTMLAttributes, ...children: any[]) {
	var mergedProps = style.mixin(styles, props);
	return react.DOM.div.apply(react.DOM, [mergedProps].concat(<any>children));
}

export = div;
