import react = require('react');
import style = require('ts-style');

import controls_theme = require('./theme');
import { div } from '../base/dom_factory';
import style_util = require('../base/style_util');

const FADE_DURATION = 0.3;

var theme = style.create(
    {
        toaster: {
            fontSize: 12,
            position: 'fixed',
            zIndex: controls_theme.Z_LAYERS.TOASTER,
            bottom: 5,
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: 'white',
            borderRadius: 5,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 4,
            paddingLeft: 10,
            paddingRight: 10,
            left: '50%',
            transform: 'translate(-50%)',

            transition: style_util.transitionOn({
                opacity: FADE_DURATION,
            }),

            progressBar: {
                outline: {
                    border: '1px solid white',
                    borderRadius: 5,
                    height: 4,
                },
                meter: {
                    backgroundColor: 'white',
                    borderRadius: 5,
                    height: 4,
                },
            },

            '> *': {
                marginLeft: 2,
                marginRight: 2,
            },
        },
    },
    __filename
);

export interface ToasterProps extends react.Props<void> {
    message: string;
    progressValue?: number;
    progressMax?: number;
}

interface ToasterState {
    opacity: number;
}

/** Control for displaying a temporary notification,
 * with an optional progress indicator.
 */
export class Toaster extends react.Component<ToasterProps, ToasterState> {
    constructor(props: ToasterProps) {
        super(props);

        this.state = { opacity: 0.01 };
    }

    componentDidEnter() {
        this.setState({ opacity: 1.0 });
    }

    componentWillLeave(callback: () => void) {
        this.setState({ opacity: 0.01 });
        setTimeout(callback, FADE_DURATION * 1000);
    }

    render() {
        var PROGRESS_WIDTH = 200;
        var meterWidth =
            this.props.progressValue / this.props.progressMax * PROGRESS_WIDTH;

        var progressBar: react.ReactElement<any>;
        if (this.props.progressMax) {
            progressBar = div(
                style.mixin([
                    theme.toaster.progressBar.outline,
                    {
                        width: PROGRESS_WIDTH + 'px',
                    },
                ]),
                div(
                    style.mixin([
                        theme.toaster.progressBar.meter,
                        {
                            width: meterWidth + 'px',
                        },
                    ])
                )
            );
        }

        const containerStyle = { opacity: this.state.opacity };

        return div(
            style.mixin([theme.toaster, containerStyle], {}),
            div({}, this.props.message),
            progressBar
        );
    }
}

export var ToasterF = react.createFactory(Toaster);
