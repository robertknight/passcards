import react = require('react');

import assign = require('../lib/base/assign');
import button = require('./controls/button');
import colors = require('./controls/colors');

interface ToolbarButtonProps extends react.Props<void> {
    value: string;
    iconUrl: string;
    onClick: () => void;
}

export function createButton(props: ToolbarButtonProps) {
    return button.ButtonF(
        assign<button.ButtonProps>(
            {
                style: button.Style.Icon,
                color: colors.TOOLBAR_ICON,
                rippleColor: colors.TOOLBAR_ICON,
                value: '',
                onClick: null,
            },
            props
        )
    );
}
