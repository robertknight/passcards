import style = require('ts-style');

import assign = require('../lib/base/assign');
import colors = require('./colors');
import fonts = require('./fonts');
import style_util = require('./base/style_util');
import text_field_theme = require('./text_field_theme');

var Z_LAYERS = {
	// controls
	TOASTER: 30,
	MENU: 10,
	FLOATING_ACTION_BUTTON: 9,
	TOOLBAR: 5,

	// views
	UNLOCK_VIEW: 20,
	DETAILS_VIEW: 2,
	ITEM_LIST_VIEW: 1
};

var SHADOWS = {
	RAISED_BUTTON: 'rgba(0, 0, 0, 0.26) 0px 2px 5px 0px',
	RAISED_BUTTON_HOVERED: 'rgba(0, 0, 0, 0.4) 0px 4px 8px 0px'
}

var mixins = style.create({
	materialDesign: {
		header: {
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			boxShadow: SHADOWS.RAISED_BUTTON,
			color: '#fff',
			fontWeight: 400
		},

		card: {
			boxShadow: 'rgba(0, 0, 0, 0.26) 0px 1px 2px 2px'
		}
	}
});

// ReactCSSTransitionGroup animation classes
var FADE_TRANSITION = style_util.transitionOn({opacity: .5});
var SLIDE_TRANSITION = style_util.transitionOn({transform: .3});

var DIVIDER_BORDER_STYLE = '1px solid ' + colors.MATERIAL_COLOR_DIVIDER;

var animations = style.create({
	slideFromLeft: {
		enter: {
			transform: 'translateX(100%)',
			active: {
				transform: 'translateX(0px)',
				transition: SLIDE_TRANSITION,
				borderLeft: '1px solid ' + colors.MATERIAL_COLOR_ACCENT3
			}
		},

		leave: {
			transform: 'translateX(0px)',
			transition: SLIDE_TRANSITION,
			active: {
				transform: 'translateX(100%)',
				borderLeft: '1px solid ' + colors.MATERIAL_COLOR_ACCENT3
			}
		}
	},

	slideFromTop: {
		enter: {
			transform: 'translateY(-100%)',
			active: {
				transform: 'translateY(0px)',
				transition: SLIDE_TRANSITION
			}
		},
		leave: {
			transform: 'translateY(0px)',
			transition: SLIDE_TRANSITION,
			active: {
				transform: 'translateY(-100%)'
			}
		}
	},

	slideFromBottom: {
		enter: {
			transform: 'translateY(100%)',
			active: {
				transform: 'translateY(0px)',
				transition: SLIDE_TRANSITION
			}
		},
		leave: {
			transform: 'translateY(0px)',
			transition: SLIDE_TRANSITION,
			active: {
				transform: 'translateY(100%)'
			}
		}
	},

	fade: {
		enter: {
			opacity: '0.01',
			active: {
				opacity: '1.0',
				transition: FADE_TRANSITION
			}
		},
		leave: {
			opacity: '1.0',
			transition: FADE_TRANSITION,
			active: {
				opacity: '0.01'
			}
		}
	}
});

var styles = style.create({
	appView: {
		width: '100%',
		height: '100%',
		userSelect: 'none',
		color: colors.MATERIAL_TEXT_PRIMARY
	},

	mixins: mixins,

	// Animations
	animations: animations,

	// Setup View
	setupView: {
		width: '100%',
		height: '100%',
		backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
		color: 'white',
		fontWeight: 'bold',

		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},

	// Item Icons
	itemIcon: {
		container: {
			width: 48,
			height: 48,
			backgroundColor: 'white',
			border: '1px solid #bbb',

			// make icon circular
			borderRadius: '50%',
			overflow: 'hidden',

			focused: {
				boxShadow: '0px 0px 2px 2px rgba(0,0,0,0.2)'
			},

			flexShrink: 0,

			// fix an issue in WebKit / Blink (tested in iOS 8,
			// Chrome 39 on Linux) where the border-radius clipping
			// would not be applied to the child <img> for the icon
			// when a transition was being applied to a nearby element.
			//
			// Forcing the icon container and its descendants into their
			// own compositing layer resolves the issue
			//
			// Possibly related to https://code.google.com/p/chromium/issues/detail?id=430184
			transform: 'translate3d(0,0,0)'
		},

		icon: {
			// horizontally center icon in outline.
			// Limit to max size of 48x48 but prefer
			// intrinsic size
			maxWidth: 48,
			maxHeight: 48,
			marginLeft: 'auto',
			marginRight: 'auto',

			// vertically center icon in outline
			display: 'block',
			position: 'relative',
			top: '50%',
			transform: 'translateY(-50%)',

			// for images that are smaller than the 48px max width,
			// make the image circular, so that the image and the
			// container have the same shape.
			//
			// If the image already fills the container then
			// the container's border-radius will make it circular.
			rounded: {
				borderRadius: '50%'
			}
		}
	},

	// Unlock View
	unlockView: {
		upper: {
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: '60%',
			boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px 5px 0px',
			zIndex: Z_LAYERS.UNLOCK_VIEW + 1
		},

		lower: {
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			position: 'absolute',
			left: 0,
			top: '40%',
			right: 0,
			bottom: 0,
			boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px -5px 0px',
			zIndex: Z_LAYERS.UNLOCK_VIEW
		},

		form: {
			backgroundColor: colors.MATERIAL_COLOR_ACCENT3,
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			height: '75%'
		},

		inputPane: {
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			width: '50%',
			minWidth: 200,
			maxWidth: 300,
			marginLeft: 'auto',
			marginRight: 'auto',
			marginTop: '10%'
		},

		masterPasswordField: {
			padding: 5,
			border: '1px solid #fff',
			borderRadius: 5,
			fontSize: 18,
			fontWeight: '400',
			color: colors.MATERIAL_COLOR_HEADER,
			backgroundColor: colors.MATERIAL_COLOR_ACCENT3,
			outline: 'none',

			'::-webkit-input-placeholder': {
				color: '#fff',
				opacity: '0.8'
			}
		},

		unlockLabel: {
			width: '100%',
			marginTop: 5,
			color: 'white',
			fontSize: fonts.BODY1_TEXT_SIZE,
			fontWeight: fonts.MEDIUM_WEIGHT
		}
	},

	// Controls - Toolbar
	toolbar: style.merge(mixins.materialDesign.header, {
		borderBottom: '1px solid #bbb',
		paddingRight: 20,
		height: 50,
		flexShrink: 0,
		zIndex: Z_LAYERS.TOOLBAR
	}),

	// Controls - Button
	button: {
		base: {
			cursor: 'pointer',

			':focus': {
				outline: 'none'
			},

			transition: style_util.transitionOn({
				backgroundColor: .3,
				boxShadow: .3
			}),

			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center'
		},

		raised: {
			boxShadow: SHADOWS.RAISED_BUTTON,

			':hover': {
				boxShadow: SHADOWS.RAISED_BUTTON_HOVERED
			},

			':focus': {
				boxShadow: SHADOWS.RAISED_BUTTON_HOVERED
			}
		},

		icon: {
			width: 24,
			height: 24
		},

		floatingAction: {
			borderRadius: '50%',
			zIndex: Z_LAYERS.FLOATING_ACTION_BUTTON,
			position: 'relative',
			overflow: 'hidden',

			// see http://www.google.co.uk/design/spec/components/buttons.html#buttons-floating-action-button
			normalSize: {
				width: 56,
				height: 56
			},

			miniSize: {
				width: 40,
				height: 40
			}
		},

		rectangular: {
			borderRadius: 3,
			overflow: 'hidden',

			position: 'relative',
			width: 'fit-content',
			marginLeft: 4,
			marginRight: 4,

			paddingLeft: 8,
			paddingRight: 8,

			minWidth: 64,

			height: 36,

			':hover': {
				backgroundColor: 'rgba(0,0,0,0.1)'
			},
		},

		circular: {
			borderRadius: '50%',
			position: 'relative',
			overflow: 'hidden',
			margin: 5,
			width: 40,
			height: 40
		},

		label: {
			fontWeight: fonts.MEDIUM_WEIGHT,
			fontSize: fonts.BUTTON_TEXT_SIZE,
			textTransform: 'uppercase',

			userSelect: 'none',

			// disable button rounding on iOS
			WebkitAppearance: 'none',
		}
	},

	// Controls - Ink Ripple effect
	inkRipple: {
		overflow: 'hidden',
		position: 'absolute',
		left: 0,
		top: 0,
		WebkitTapHighlightColor: 'transparent',
		/* the ripple listens for mouse events on the parent
		 * element itself.
		 */
		pointerEvents: 'none',

		container: {
			// layout the child elements in their own stacking context so
			// that they appear on top of the ripple effect
			position: 'relative',
			zIndex: 0
		}
	},

	// Controls - Toaster
	toaster: {
		fontSize: 12,
		position: 'fixed',
		zIndex: Z_LAYERS.TOASTER,
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

		progressBar: {
			outline: {
				border: '1px solid white',
				borderRadius: 5,
				height: 4
			},
			meter: {
				backgroundColor: 'white',
				borderRadius: 5,
				height: 4
			}
		},

		'> *': {
			marginLeft: 2,
			marginRight: 2
		}
	},

	// Controls - Menu
	// http://www.google.co.uk/design/spec/components/menus.html
	menu: {
		position: 'absolute',
		paddingTop: 8,
		paddingBottom: 8,
		boxSizing: 'border-box',
		boxShadow: 'rgba(0, 0, 0, 0.26) 0px 1px 2px 2px',
		backgroundColor: 'white',
		overflowY: 'hidden',
		transform: 'translate3d(0,0,0)',
		transition: style_util.transitionOn({
			opacity: .3,
			transform: .3
		}),

		// container which holds the menu itself and the overlay
		// which covers the background
		container: {
			position: 'absolute',
			left: 0,
			top: 0,
			right: 0,
			bottom: 0,
			zIndex: Z_LAYERS.MENU,
		},

		// overlay which appears behind the menu
		// and intercepts click/touch events to
		// dismiss the menu.
		//
		// On small screens it also serves to
		// dim the background to highlight the menu
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

		item: {
			position: 'relative',
			paddingLeft: 16,
			paddingRight: 16,
			fontSize: 16,
			cursor: 'pointer',
			userSelect: 'none',
			verticalAlign: 'middle',
			lineHeight: '48px',
			height: 48,
			textOverflow: 'ellipsis',

			':hover' : {
				backgroundColor: colors.MATERIAL_GREY_P200
			},

			label: {
				width: '100%',
				height: '100%',
				
				// give menu item label its own stacking context so
				// that it renders on top of ripple effect
				transform: 'translate3d(0,0,0)'
			}
		}
	},

	// Controls - Text Field
	textField: text_field_theme.styles,

	// Item List
	itemList: {
		toolbar: {
			width: '100%',
			position: 'fixed',
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',

			searchIcon: {
				marginLeft: 20,
				flexShrink: '0',
				flexGrow: '0'
			},

			searchField: {
				flexGrow: '1',
				paddingLeft: 5,
				marginLeft: 20,
				height: 30,
				border: 0,
				color: colors.MATERIAL_COLOR_HEADER,
				backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
				fontSize: 20,
				outline: 'none',

				/* enable the search field to shrink
				   when the width of the toolbar is collapsed
				   in Firefox
				*/
				overflow: 'hidden',

				'::-webkit-input-placeholder': {
					color: '#fff',
					opacity: '0.8'
				}
			},

			iconGroup: {
				marginLeft: 10,
				marginRight: 10,
				flexShrink: '0',
				flexGrow: '0',
				display: 'flex',
				height: '100%'
			},
		},

		container: {
			display: 'flex',
			flexDirection: 'column',
			height: '100%',
			position: 'relative',
			zIndex: Z_LAYERS.ITEM_LIST_VIEW
		},

		list: {
			marginTop: 50,
			height: '100%',
			backgroundColor: 'white',
			position: 'relative',

			overflow: 'auto',
			overflowScrolling: 'auto',
			WebkitOverflowScrolling: 'touch',

			footer: {
				position: 'absolute',
				color: 'rgba(0,0,0,0)'
			}
		},

		item: {
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			cursor: 'pointer',
			paddingLeft: 16,
			paddingRight: 5,
			position: 'absolute',
			width: '100%',
			boxSizing: 'border-box',

			// total item height is 72px,
			// 48px icon + 1px border around icon + 11px margin top/bottom
			marginTop: 11,
			marginBottom: 11,

			focusIndicator: {
				position: 'absolute',
				left: 3,
				top: '50%',
				transform: 'translateY(-50%)',
				fontSize: 10,
				opacity: '0.3'
			},

			details: {
				marginLeft: 16,

				title: {
					fontSize: fonts.ITEM_LIST_PRIMARY_TEXT_SIZE
				},

				account: {
					fontSize: fonts.ITEM_LIST_SECONDARY_TEXT_SIZE,
					color: colors.MATERIAL_TEXT_SECONDARY
				}
			}
		},
	},

	// Details View
	detailsView: {
		toolbarSpacer: {
			flexGrow: '1'
		},

		content: {
			flexGrow: 1
		},

		coreFields: {
			paddingTop: 5,
			paddingBottom: 5
		},

		section: {
			title: {
				fontSize: fonts.CAPTION_TEXT_SIZE,
				color: colors.MATERIAL_TEXT_SECONDARY,
				fontWeight: fonts.REGULAR_WEIGHT,
				height: 48,

				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',

				// add negative margin below title to get
				// even spacing between divider line separating
				// this from the previous section and the label
				// of the first field in this section
				marginBottom: -12
			},

			divider: {
				width: '100%',
				borderBottom: DIVIDER_BORDER_STYLE
			}
		},

		divider: {
			width: '100%',
			borderBottom: DIVIDER_BORDER_STYLE,
			marginTop: 12,
			marginBottom: 12
		},

		field: {
			display: 'flex',
			flexDirection: 'column',
			paddingRight: 20,
			maxWidth: 300,

			actions: {
				display: 'flex',
				flexDirection: 'row',
				order: 3,
				justifyContent: 'center'
			}
		},

		itemActionBar: {
			paddingLeft: 10,
			paddingRight: 10,
			paddingTop: 10,
			paddingBottom: 5,
			marginBottom: 10
		},

		container: {
			backgroundColor: 'white',
			position: 'absolute',
			transition: style_util.transitionOn({
				left: .3,
				top: .3,
				width: .3,
				height: .3
			}),
			zIndex: Z_LAYERS.DETAILS_VIEW,
			display: 'flex',
			flexDirection: 'column',

			// disable the focus ring around the
			// edge of the details view when focused
			':focus': {
				outline: 0
			}
		},

		header: {
			backgroundColor: 'transparent',
			flexShrink: 0,
			boxShadow: 'none',

			// padding chosen to match icon padding in item list
			// for item list -> details view transition
			paddingLeft: 16,
			transition: style_util.transitionOn({
				all: .2,
				color: .01
			}),

			toolbar: {
				position: 'absolute',
				left: 0,
				top: 0,
				right: 0,
				height: 40,

				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center'
			},

			iconAndDetails: {
				display: 'flex',
				flexDirection: 'row',

				details: {
					marginLeft: 16,
					display: 'flex',
					flexDirection: 'column',
					position: 'relative',
					flexGrow: 1,

					// style for the container of the title and account fields
					// at the start of the entry transition for the details
					// view
					itemList: {
						position: 'absolute',
						left: 0,
						right: 0,
						top: 0,
						bottom: 0,
						transition: style_util.transitionOn({opacity: .2}),
						opacity: 1,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center'
					},

					// style for the container of the title and account
					// fields in the details view
					detailsView: {
						position: 'relative',
						right: 0,
						top: 0,
						bottom: 0,
						color: 'white',
						transition: style_util.transitionOn({opacity: .2}),
						opacity: 0,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center'
					}
				},
			},

			entered: {
				backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
				paddingTop: 40,
				paddingBottom: 15,
				boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px 5px 0px'
			},

			title: {
				fontSize: fonts.HEADLINE_TEXT_SIZE
			},

			account: {
				fontSize: fonts.ITEM_LIST_SECONDARY_TEXT_SIZE
			}
		},
	}
});

export = styles;

