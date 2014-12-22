import style = require('ts-style');

import assign = require('../lib/base/assign');
import colors = require('./colors');
import text_field_theme = require('./text_field_theme');

var mixins = style.create({
	materialDesign: {
		header: {
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px 5px 0px',
			color: '#fff',
			fontWeight: 400
		}
	}
});

// ReactCSSTransitionGroup animation classes
var FADE_TRANSITION = 'opacity .5s ease-out';
var SLIDE_TRANSITION = 'transform .3s ease-out';

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
		userSelect: 'none'
	},

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
			}
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

			// make image circular. Even if the image is too
			// small to fill the circular container, it looks
			// better if the image and the container have the
			// same shape
			borderRadius: '50%'
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
			zIndex: '2'
		},

		lower: {
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			position: 'absolute',
			left: 0,
			top: '40%',
			right: 0,
			bottom: 0,
			boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px -5px 0px',
			zIndex: '1'
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
			fontSize: 14,
			fontWeight: 'bold'
		}
	},

	// Controls - Toolbar
	toolbar: style.merge(mixins.materialDesign.header, {
		borderBottom: '1px solid #bbb',
		paddingRight: 20,
		height: 40,
		flexShrink: 0
	}),

	toolbarButton: {
		icon: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			marginLeft: 2,
			marginRight: 2,
			width: 40,
			height: 40,
			borderRadius: '50%'
		},
		active: {
			backgroundColor: 'rgba(255, 255, 255, 0.3)'
		}
	},

	// Controls - Button
	actionButton: {
		container: {
			position: 'relative',
			width: 'fit-content'
		},
		button: {
			paddingTop: 5,
			paddingBottom: 5,
			paddingLeft: 15,
			paddingRight: 15,
			border: 0,
			backgroundColor: colors.MATERIAL_COLOR_PRIMARY,
			boxShadow: 'rgba(0, 0, 0, 0.26) 0px 2px 5px 0px',
			color: '#fff',
			fontWeight: 400,
			textTransform: 'uppercase',

			// disable button rounding on iOS
			WebkitAppearance: 'none'
		}
	},

	// Controls - Ink Ripple effect
	inkRipple: {
		/* force an element to be given its own
		 * compositor layer.
		 *
		 * This can be used to reduce the amount of
		 * repainting work for animated elements
		 */
		transform: 'translate3d(0,0,0)',
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
		zIndex: 10,
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
		boxShadow: 'rgba(0, 0, 0, 0.26) 0px 1px 2px 2px',
		zIndex: 10,
		backgroundColor: 'white',
		overflowY: 'hidden',
		transform: 'translate3d(0,0,0)',

		item: {
			position: 'relative',
			paddingLeft: 16,
			paddingRight: 16,
			fontSize: 16,
			cursor: 'pointer',
			userSelect: 'none',
			verticalAlign: 'middle',
			lineHeight: '48px',

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
			height: '100%'
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

			focusIndicator: {
				position: 'absolute',
				left: 3,
				top: '50%',
				transform: 'translateY(-50%)',
				fontSize: 10,
				opacity: '0.3'
			},

			details: {
				padding: 5,
				marginLeft: 5,

				title: {
					opacity: '0.7',
					fontSize: 13,
					fontWeight: 'bold'
				},

				account: {
					fontSize: 12,
					color: '#888888'
				}
			}
		},
	},

	// Details View
	detailsView: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		backgroundColor: 'white',
		display: 'flex',
		flexDirection: 'column',

		// disable the focus ring around the
		// edge of the details view when focused
		':focus': {
			outline: 0
		},

		toolbar: style.merge(mixins.materialDesign.header, {
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
		}),

		toolbarSpacer: {
			flexGrow: '1'
		},

		overview: {
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			marginLeft: 10,

			title: {
				fontSize: 16
			},

			location: {
				color: '#666',
				textOverflow: 'ellipsis',
				overflow: 'hidden',

				' a': {
					textDecoration: 'none'
				}
			},
		},

		// container that holds the list of field
		// views / editors for the item
		fieldsContainer: {
			flexGrow: 1,
			position: 'relative',
			overflowY: 'auto'
		},

		content: {
			paddingLeft: 16,
			flexGrow: 1,
			position: 'absolute'
		},

		header: {
			display: 'flex',
			flexDirection: 'row',
			paddingBottom: 5,
			marginBottom: 15
		},

		coreFields: {
			paddingTop: 5,
			paddingBottom: 5
		},

		field: {
			display: 'flex',
			flexDirection: 'column',
			paddingLeft: 20,
			paddingRight: 20,

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
		}
	}
});

export = styles;

