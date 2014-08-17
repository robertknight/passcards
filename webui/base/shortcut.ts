/** Shortcut installs key handlers to handle a shortcut
  * key and invoke a handler in response.
  *
  * Shortcuts remain in effect until disabled via remove()
  */
export class Shortcut {
	private document: Document;
	private listener: (ev: KeyboardEvent) => any;
	private enabled: boolean;

	/** Installs a shortcut which listens for a press of @p key
	  * and invokes @p handler in response.
	  *
	  * remove() must be called to uninstall the shortcut if it
	  * is no longer needed.
	  */
	constructor(document: Document, keyCode: number, handler: () => void) {
		this.document = document;
		this.listener = (e) => {
			if (e.target == this.document.body && e.keyCode == keyCode) {
				e.preventDefault();
				handler();
			}
		};
		this.enabled = false;
		this.setEnabled(true);
	}

	remove() {
		this.setEnabled(false);
	}

	setEnabled(enable: boolean) {
		if (enable == this.enabled) {
			return;
		}
		this.enabled = enable;
		if (enable) {
			this.document.addEventListener('keydown', this.listener);
		} else {
			this.document.removeEventListener('keydown', this.listener);
		}
	}
}

