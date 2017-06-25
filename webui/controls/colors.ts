function hex(value: number) {
    return Math.round(value).toString(16);
}

function premultiply(dest: number, src: number, alpha: number) {
    return alpha * dest + (1 - alpha) * src;
}

function premultiplyColor(r: number, g: number, b: number, alpha: number) {
    var rOut = premultiply(r, 255, alpha);
    var gOut = premultiply(g, 255, alpha);
    var bOut = premultiply(b, 255, alpha);
    return '#' + hex(rOut) + hex(gOut) + hex(bOut);
}

// see http://www.google.com/design/spec/style/typography.html
var colors = {
    premultiplyColor: premultiplyColor,

    MATERIAL_COLOR_PRIMARY: '#e91e63',
    MATERIAL_COLOR_HEADER: '#fff',
    MATERIAL_COLOR_ACCENT1: '#fce4ec',
    MATERIAL_COLOR_ACCENT2: '#f48fb1',
    MATERIAL_COLOR_ACCENT3: '#f06292',

    // http://www.google.com/design/spec/components/dividers.html#dividers-specs
    MATERIAL_COLOR_DIVIDER: premultiplyColor(0, 0, 0, 0.12),

    MATERIAL_GREY_P200: '#eeeeee',
    MATERIAL_GREY_P500: '#9e9e9e',

    MATERIAL_RED_P500: '#f44336',

    MATERIAL_TEXT_PRIMARY: premultiplyColor(0, 0, 0, 0.87),
    MATERIAL_TEXT_SECONDARY: premultiplyColor(0, 0, 0, 0.54),

    TOOLBAR_ICON: 'white',
};

export = colors;
