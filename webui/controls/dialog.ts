import typed_react = require('typed-react');
import react = require('react');
import style = require('ts-style');

import controls_theme = require('./theme');
import button = require('./button');
import colors = require('./colors');
import reactutil = require('../base/reactutil');
import style_util = require('../base/style_util');
import transition_mixin = require('../base/transition_mixin');

export interface Action {
	/** The label of the dialog action, eg. 'OK', 'Cancel' */
	label: string;
	/** Callback which is invoked when the action is selected. */
	onSelect: () => void;
}

export interface DialogProps extends react.Props<void> {
	acceptAction?: Action;
	rejectAction?: Action;
}

let theme = style.create({
	// container which holds the dialog itself and the overlay
	// which covers the background
	container: {
		position: 'absolute',
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},

	dialog: {
		position: 'relative',
		backgroundColor: 'white',
		// box shadow taken from Angular Material implementation
		boxShadow: '0px 8px 10px -5px rgba(0, 0, 0, 0.14),' +
		'0px 16px 24px 2px rgba(0, 0, 0, 0.098),' +
		'0px 6px 30px 5px rgba(0, 0, 0, 0.082)',
		zIndex: controls_theme.Z_LAYERS.DIALOG
	},

	contentArea: {
		padding: 24,
		color: colors.MATERIAL_TEXT_SECONDARY
	},

	actionsArea: {
		boxSizing: 'border-box',
		display: 'flex',
		height: 52,
		justifyContent: 'flex-end',
		padding: 8,
	},

	// overlay which appears behind the dialog
	// and intercepts click/touch events to
	// dismiss the dialog.
	overlay: {
		position: 'fixed',

		left: 0,
		right: 0,
		top: 0,
		bottom: 0,

		backgroundColor: '#000',
		opacity: 0.01,

		transition: style_util.transitionOn({
			opacity: .3
		})
	},
}, __filename);

function buttonForAction(action: Action, ref: string) {
	if (!action) {
		return;
	}
	return button.ButtonF({
		ref,
		style: button.Style.Rectangular,
		value: action.label,
		onClick: action.onSelect
	});
}

interface DialogState extends transition_mixin.TransitionMixinState {
}

const OVERLAY_REF = 'overlay';

/** A modal dialog component.
 *
 * See https://www.google.com/design/spec/components/dialogs.html#dialogs-specs
 */
export class Dialog extends typed_react.Component<DialogProps, DialogState> {
	getInitialState() {
		return {
			transitionProperty: 'opacity',
			transitionComponent: OVERLAY_REF
		};
	}

	render() {
		return react.DOM.div(style.mixin(theme.container),
			this.renderOverlay(),
			this.renderDialog()
			);
	}

	private renderDialog() {
		if (this.state.transition === reactutil.TransitionState.Leaving ||
			this.state.transition === reactutil.TransitionState.Left) {
			return null;
		}

		let acceptButton = buttonForAction(this.props.acceptAction, 'accept');
		let rejectButton = buttonForAction(this.props.rejectAction, 'reject');

		return react.DOM.div(style.mixin(theme.dialog),
			react.DOM.div(style.mixin(theme.contentArea), this.props.children),
			react.DOM.div(style.mixin(theme.actionsArea),
				rejectButton,
				acceptButton
				)
			);
	}

	private renderOverlay() {
		let overlayStyles: Object[] = [theme.overlay];
		if (this.state.transition === reactutil.TransitionState.Entered) {
			overlayStyles.push({ opacity: .2 });
		}

		let clickHandler: react.MouseEventHandler;
		if (this.props.rejectAction) {
			clickHandler = this.props.rejectAction.onSelect;
		} else if (this.props.acceptAction) {
			clickHandler = this.props.acceptAction.onSelect;
		}

		return react.DOM.div(style.mixin(overlayStyles, {
			onClick: clickHandler,
			ref: OVERLAY_REF
		}));
	}
}

export let DialogF = reactutil.createFactory(Dialog, transition_mixin.TransitionMixinM);
