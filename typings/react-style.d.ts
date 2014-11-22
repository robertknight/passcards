declare module ReactStyle {
	interface CompiledStyles {
		css: string;
		classNames: {[name: string] : boolean};
	}

	interface StyleMap {
		[id: string] : Style;
	}

	interface Style {
		children: StyleMap;
		className: string;

		isCompiled(): boolean;
	}

	/** A map of camelCase-d CSS property names
	  * to values.
	  */
	interface StyleProps {
		/** Specify the value for a style property.
		  * The value may be a string, number or
		  * Style instance.
		  */
		[property: string] : any;
	}

	interface ReactStyle {
		/** @see create() */
		(props: StyleProps, className?: string) : Style;

		/** Create a new style with a given set of CSS properties.
		  * 
		  * @param props A dictionary of camel-cased CSS property names
		  *  and values. The property names are converted into
		  *  hyphen-spaced names in the generated CSS.
		  * @param className The optional name of the class to use in the generated CSS,
		  *  if not specified, a default is used.
		  */
		create(props: StyleProps, className?: string) : Style;

		/** Compile all of the styles created via calls to create()
		  * to CSS using compile() and inject them into the current
		  * document, by inserting them into a new <style> tag
		  * inside the <head> element.
		  *
		  * When React components are rendered, Style instances specified
		  * in the `styles` attribute of the component's props are
		  * mapped 
		  */
		inject() : void;

		/** Compile all of the styles created via calls to create()
		  * into CSS.
		  *
		  * @returns The generated CSS for all styles.
		  */
		compile() : CompiledStyles;
	}
}

declare module 'react-style' {
	var ReactStyle : ReactStyle.ReactStyle;
	export = ReactStyle;
}
