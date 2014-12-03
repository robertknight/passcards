import colors = require('./colors');
import style = require('./base/style');

var styles = style.create({
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
	unlockPane: {
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
			outline: 'none'
		},

		'masterPasswordField::-webkit-input-placeholder': {
			color: '#fff',
			opacity: '0.8'
		},

		unlockLabel: {
			width: '100%',
			marginTop: 5,
			color: 'white',
			fontSize: 14,
			fontWeight: 'bold'
		}
	},

	// Toolbar
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
			textTransform: 'uppercase'
		}
	},

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
		pointerEvents: 'none'
	},

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
		transform: 'translate(-50)',

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
	},

	/* menu control
	   http://www.google.co.uk/design/spec/components/menus.html
	*/
	menu: {
		position: 'absolute',
		paddingTop: 8,
		paddingBottom: 8,
		boxShadow: 'rgba(0, 0, 0, 0.26) 0px 1px 2px 2px',
		zIndex: 10,
		backgroundColor: 'white',

		item: {
			position: 'relative',
			paddingLeft: 16,
			paddingRight: 16,
			fontSize: 16,
			cursor: 'pointer',
			userSelect: 'none',
			verticalAlign: 'middle',
			lineHeight: 48
		}
	},

	// Item List
	itemListView: {
		display: 'flex',
		flexDirection: 'column',
		height: '100%'
	},

	itemList: {
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
	}
});

export = styles;

