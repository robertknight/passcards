export interface Style {
	key?: string;
	parent?: Style;
}

export interface StyleRegistry {
	styles() : {[name: string] : Style} 
	add(style: Style) : void;
}

class StyleRegistryImpl implements StyleRegistry {
	private styleMap: {[name: string]: Style};

	constructor() {
		this.styleMap = {};
	}

	add(style: Style) {
		this.styleMap[style.key] = style;
	}

	styles() {
		return this.styleMap;
	}
}

export var registry: StyleRegistry = new StyleRegistryImpl();

function addKeys(tree: any) {
	Object.keys(tree).forEach((k) => {
		var prop = tree[k];
		if (typeof prop === 'object' && prop !== tree) {
			addKeys(prop);

			prop.key = k;
			prop.parent = tree;
		}
	});
}

export function create<T>(tree: T) : T {
	addKeys(tree);

	Object.keys(tree).forEach((k) => {
		var style = <Style>(<any>tree)[k];
		if (style.key) {
			registry.add(style);
		}
	});

	return tree;
}

function className(style: Style) : string {
	var name = style.key ? style.key : '';
	if (style.parent) {
		var parentClass = className(style.parent);
		if (parentClass) {
			name = parentClass + '-' + name;
		}
	}
	return name;
}

export function classes<T>(...objects: T[]) : string {
	var classNames = '';
	objects.forEach((object) => {
		if (!object) {
			return;
		}
		var compiled = <Style>object;
		if (classNames.length > 0) {
			classNames += ' ';
		}
		classNames += className(compiled);
	});
	return classNames;
}

function cssPropName(name: string) {
	// adapted from React's hyphenate.js
	var uppercasePattern = /([A-Z])/g;
	return name.replace(uppercasePattern, '-$1').toLowerCase();
}

function cssPropValue(value: any) {
	if (typeof value == 'number') {
		return value + 'px';
	} else {
		return value.toString();
	}
}

function cssClass(name: string, exprs: string[]) {
	var css = '.' + name + ' {\n';
	exprs.forEach((expr, index) => {
		css += '  ' + expr + ';\n';
	});
	css += '}';
	return css;
}

export function compile<T>(tree: T) : string {
	var classes: string[] = [];
	var cssProps: string[] = [];
	Object.keys(tree).forEach((k) => {
		if (k === 'key' || k === 'parent') {
			return;
		}

		var prop = (<any>tree)[k];
		if (typeof prop == 'object') {
			classes.push(compile(prop));
		} else {
			cssProps.push(cssPropName(k) + ': ' + cssPropValue(prop));
		}
	});
	
	var style: Style = tree;
	var css = style.key ? cssClass(className(style), cssProps) : '';
	return [css].concat(classes).join('\n\n');
}

