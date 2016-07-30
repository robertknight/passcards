import react = require('react');
import style = require('ts-style');

import controls_theme = require('./theme');
import button = require('./button');
import colors = require('./colors');
import reactutil = require('../base/reactutil');
import style_util = require('../base/style_util');
import { TransitionChildProps } from '../base/transition_container';

export interface Action {
	/** The label of the dialog action, eg. 'OK', 'Cancel' */
	label: string;
	/** Callback which is invoked when the action is selected. */
	onSelect: () => void;
}

export interface DialogProps extends TransitionChildProps {
	acceptAction?: Action;
	rejectAction?: Action;

	/** Additional styles that are applied to the container of the
	 * dialog which covers the entire viewport.
	 *
	 * This can be used to set the Z index of the dialog for example.
	 */
	containerStyle?: react.CSSProperties;
}

const DIALOG_TRANSITION_DURATION = 300;

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
		alignItems: 'center',
		zIndex: controls_theme.Z_LAYERS.DIALOG
	},

	dialog: {
		position: 'relative',
		backgroundColor: 'white',
		// box shadow taken from Angular Material implementation
		boxShadow: '0px 8px 10px -5px rgba(0, 0, 0, 0.14),' +
		'0px 16px 24px 2px rgba(0, 0, 0, 0.098),' +
		'0px 6px 30px 5px rgba(0, 0, 0, 0.082)',

		opacity: 0.01,

		transition: style_util.transitionOn({
			opacity: DIALOG_TRANSITION_DURATION / 1000.0
		})
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
			opacity: DIALOG_TRANSITION_DURATION / 1000.0
		})
	},
}, __filename);

function buttonForAction(action: Action, ref: string) {
	if (!action) {
		return null;
	}
	return button.ButtonF({
		ref,
		style: button.Style.Rectangular,
		value: action.label,
		onClick: action.onSelect
	});
}

/** Returns true if a component with a given TransitionState
 * has entered the scene.
 */
function hasEntered(state: reactutil.TransitionState) {
	if (typeof state === 'undefined') {
		return true;
	} else {
		return state === reactutil.TransitionState.Entered;
	}
}

/** A modal dialog component.
 *
 * See https://www.google.com/design/spec/components/dialogs.html#dialogs-specs
 */
export class Dialog extends react.Component<DialogProps, {}> {

	render() {
		return react.DOM.div(style.mixin([theme.container, this.props.containerStyle]),
			this.renderOverlay(),
			this.renderDialog()
			);
	}

	componentWillReceiveProps(nextProps: DialogProps) {
		if (nextProps.onEntered) {
			setTimeout(() => nextProps.onEntered(), DIALOG_TRANSITION_DURATION);
		} else if (nextProps.onLeft) {
			setTimeout(() => nextProps.onLeft(), DIALOG_TRANSITION_DURATION);
		}
	}

	private renderDialog() {
		let dialogStyles: Object[] = [theme.dialog];
		if (hasEntered(this.props.transitionState)) {
			dialogStyles.push({ opacity: 1.0 });
		}
		let acceptButton = buttonForAction(this.props.acceptAction, 'accept');
		let rejectButton = buttonForAction(this.props.rejectAction, 'reject');

		return react.DOM.div(style.mixin(dialogStyles),
			react.DOM.div(style.mixin(theme.contentArea), this.props.children),
			react.DOM.div(style.mixin(theme.actionsArea),
				rejectButton,
				acceptButton
				)
			);
	}

	private renderOverlay() {
		let overlayStyles: Object[] = [theme.overlay];
		if (hasEntered(this.props.transitionState)) {
			overlayStyles.push({ opacity: .2 });
		}

		let clickHandler: react.MouseEventHandler;
		if (this.props.rejectAction) {
			clickHandler = this.props.rejectAction.onSelect;
		} else if (this.props.acceptAction) {
			clickHandler = this.props.acceptAction.onSelect;
		}

		return react.DOM.div(style.mixin(overlayStyles, {
			onClick: clickHandler
		}));
	}
}

export let DialogF = react.createFactory(Dialog);
