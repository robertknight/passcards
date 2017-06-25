import style = require('ts-style');

import colors = require('./controls/colors');
import controls_theme = require('./controls/theme');
import style_util = require('./base/style_util');

export var Z_LAYERS = {
    TOOLBAR: 5,
    MENU_LAYER: 30,
    SETUP_VIEW: 20,
    UNLOCK_VIEW: 20,
};

export var mixins = style.create({
    materialDesign: {
        header: {
            backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
            boxShadow: controls_theme.SHADOWS.RAISED_BUTTON,
            color: '#fff',
            fontWeight: 400,
        },

        card: {
            boxShadow: 'rgba(0, 0, 0, 0.26) 0px 1px 2px 2px',
        },
    },
});

// ReactCSSTransitionGroup animation classes
export const FADE_TRANSITION_TIMEOUT = 500;
const FADE_TRANSITION = style_util.transitionOn({
    opacity: FADE_TRANSITION_TIMEOUT / 1000.0,
});

export const SLIDE_TRANSITION_TIMEOUT = 300;
const SLIDE_TRANSITION = style_util.transitionOn({
    transform: SLIDE_TRANSITION_TIMEOUT / 1000.0,
});

export var animations = style.create({
    slideFromLeft: {
        enter: {
            transform: 'translateX(100%)',
            active: {
                transform: 'translateX(0px)',
                transition: SLIDE_TRANSITION,
                borderLeft: '1px solid ' + colors.MATERIAL_COLOR_ACCENT3,
            },
        },

        leave: {
            transform: 'translateX(0px)',
            transition: SLIDE_TRANSITION,
            active: {
                transform: 'translateX(100%)',
                borderLeft: '1px solid ' + colors.MATERIAL_COLOR_ACCENT3,
            },
        },
    },

    slideFromTop: {
        enter: {
            transform: 'translateY(-100%)',
            active: {
                transform: 'translateY(0px)',
                transition: SLIDE_TRANSITION,
            },
        },
        leave: {
            transform: 'translateY(0px)',
            transition: SLIDE_TRANSITION,
            active: {
                transform: 'translateY(-100%)',
            },
        },
    },

    slideFromBottom: {
        enter: {
            transform: 'translateY(100%)',
            active: {
                transform: 'translateY(0px)',
                transition: SLIDE_TRANSITION,
            },
        },
        leave: {
            transform: 'translateY(0px)',
            transition: SLIDE_TRANSITION,
            active: {
                transform: 'translateY(100%)',
            },
        },
    },

    fade: {
        enter: {
            opacity: '0.01',
            active: {
                opacity: '1.0',
                transition: FADE_TRANSITION,
            },
        },
        leave: {
            opacity: '1.0',
            transition: FADE_TRANSITION,
            active: {
                opacity: '0.01',
            },
        },
    },
});
