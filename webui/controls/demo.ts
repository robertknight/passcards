
import react = require('react');
import typed_react = require('typed-react');
import style = require('ts-style');

import button = require('./button');
import dialog = require('./dialog');
import env = require('../../lib/base/env');
import fonts = require('./fonts');
import menu = require('./menu');
import reactutil = require('../base/reactutil');
import ripple = require('./ripple');
import text_field = require('./text_field');

import { TransitionContainerF } from '../base/transition_container';

var theme = style.create({
	app: {
		maxWidth: 500,
		marginLeft: 'auto',
		marginRight: 'auto'
	},

	section: {
		marginBottom: 40,

		header: {
			fontSize: fonts.body1.size,
			borderBottom: '1px solid #ccc',
			paddingBottom: 5,
			marginBottom: 10
		},

		content: {
			paddingLeft: 16,
			paddingRight: 16
		}
	},

	rippleContainer: {
		width: 300,
		height: 50,
		border: '1px solid #cccccc',
		fontFamily: 'Roboto, Helvetica Neue, Segoe UI, Helvetica, Arial',
		position: 'relative',
		WebkitTapHighlightColor: 'transparent',
		WebkitUserSelect: 'none'
	}
}, __filename);

interface ControlDemoAppProps extends react.Props<void> {
	viewportRect: reactutil.Rect;
}

interface ControlDemoAppState {
	menuPos?: {
		left: number;
		top: number;
	};
	showDialog?: boolean;
}

function componentSection(name: string, ...children: react.ReactElement<any>[]) {
	return react.DOM.div(style.mixin(theme.section, {}),
		react.DOM.div(style.mixin(theme.section.header), name),
		react.DOM.div(style.mixin(theme.section.content), children)
		);
}

class ControlDemoApp extends typed_react.Component<ControlDemoAppProps, ControlDemoAppState> {
	getInitialState() {
		return {
			showDialog: false
		};
	}

	private renderTextFields() {
		return componentSection('Text Fields',
			text_field.TextFieldF({
				placeHolder: 'Text Field',
				showUnderline: true
			}),
			text_field.TextFieldF({
				placeHolder: 'Text Field with Floating Label',
				floatingLabel: true
			}),
			text_field.TextFieldF({
				showUnderline: true,
				placeHolder: 'Text field with validation error',
				error: 'There is something wrong with the input'
			})
			);
	}

	private renderButtons() {
		return componentSection('Buttons',
			button.ButtonF({
				value: 'Flat Button',
				onClick: () => { },
				style: button.Style.Rectangular
			}),
			button.ButtonF({
				value: 'Flat Button (Disabled)',
				disabled: true,
				onClick: () => { },
				style: button.Style.Rectangular
			}),
			button.ButtonF({
				value: 'Floating Action',
				onClick: () => { },
				style: button.Style.FloatingAction,
				backgroundColor: '#FF4081',
				rippleColor: 'white',
				color: 'rgba(255,255,255,0.95)',
				iconUrl: '/webui/icons/icons.svg#input'
			}),
			button.ButtonF({
				value: 'Raised Button',
				onClick: () => { },
				style: button.Style.RaisedRectangular
			}),
			button.ButtonF({
				value: 'Raised Button (Disabled)',
				onClick: () => { },
				style: button.Style.RaisedRectangular,
				disabled: true
			}),
			button.ButtonF({
				value: 'Icon Button',
				onClick: () => { },
				style: button.Style.Icon,
				iconUrl: '/webui/icons/icons.svg#input'
			})
			);
	}

	private renderDialog() {
		let prompt: react.ReactElement<{}>;
		if (this.state.showDialog) {
			prompt = dialog.DialogF({
				acceptAction: {
					label: 'Yes',
					onSelect: () => {
						this.setState({ showDialog: false });
						console.log('Dialog accepted');
					}
				},
				rejectAction: {
					label: 'No',
					onSelect: () => {
						this.setState({ showDialog: false });
						console.log('Dialog rejected');
					}
				}
			}, 'Are you happy with the look of this dialog?');
		};
		return componentSection('Dialogs',
			button.ButtonF({
				value: 'Show Dialog',
				onClick: () => {
					this.setState({ showDialog: true });
				},
				style: button.Style.Rectangular
			}),
			TransitionContainerF({
				onComponentRemoved: (key) => {
					console.log('Removed component', key);
				}
			}, prompt)
			);
	}

	private renderMenus() {
		var popupMenu: react.ReactElement<menu.MenuProps>;
		if (this.state.menuPos) {
			var menuItems = [{
				label: 'Item One',
				onClick: () => console.log('Item one clicked')
			}, {
					label: 'Item Two',
					onClick: () => console.log('Item two clicked')
				}, {
					label: 'Item Three',
					onClick: () => console.log('Item three clicked')
				}];
			popupMenu = menu.MenuF({
				items: menuItems,
				viewportRect: this.props.viewportRect,
				sourceRect: {
					left: this.state.menuPos.left,
					top: this.state.menuPos.top,
					right: this.state.menuPos.left,
					bottom: this.state.menuPos.top
				},
				onDismiss: () => {
					this.setState({ menuPos: null });
				},
				zIndex: 1
			});
		}

		return componentSection('Menus',
			button.ButtonF({
				value: 'Show Menu',
				style: button.Style.RaisedRectangular,
				onClick: (e: react.MouseEvent) => {
					this.setState({ menuPos: { left: e.pageX, top: e.pageY } });
				}
			}),
			reactutil.TransitionGroupF({}, popupMenu)
			);
	}

	render() {
		return react.DOM.div(style.mixin(theme.app, {}),
			componentSection('Ripple Effects',
				react.DOM.div(style.mixin(theme.rippleContainer, {
				}),
					ripple.InkRippleF({ color: '#808080' },
						'Ripple Child Element'
						)
					)
				),
			this.renderMenus(),
			this.renderButtons(),
			this.renderTextFields(),
			this.renderDialog()
			);
	}
}
var ControlDemoAppF = reactutil.createFactory(ControlDemoApp);

function main() {
	var elt = document.getElementById('app');
	var body = elt.ownerDocument.body;

	var renderRootView = () => {
		react.render(ControlDemoAppF({ viewportRect: body.getBoundingClientRect() }), elt);
	};
	elt.ownerDocument.defaultView.onresize = () => {
		renderRootView();
	};
}

if (env.isBrowser()) {
	main();
}
