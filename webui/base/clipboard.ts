let clipboardDocument = document;

/**
  * Set the Document used for clipboard access.
  *
  * Defaults to the initial document into which the application is loaded.
  *
  * In the context of Firefox WebExtensions the clipboard APIs cannot
  * be used from background pages directly, but must be invoked from
  * the popup window's document.
  *
  * See https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Interact_with_the_clipboard
  * and https://bugzilla.mozilla.org/show_bug.cgi?id=1272869
  */
export function setClipboardDocument(doc: Document) {
	clipboardDocument = doc;
}

/**
  * Copy data to the system clipboard.
  *
  * This may only be called within the context of a user gesture.
  */
export function copy(mimeType: string, data: string) {
	// Use the Document#execCommand('copy') API which is available in recent versions
	// of Firefox, Chrome and iOS >= 10
	//
	// Note that this only works if called within the context of a user gesture
	//
	// See http://stackoverflow.com/questions/35996460/
	const listener = (e: ClipboardEvent) => {
		e.clipboardData.setData(mimeType, data);
		e.preventDefault();
	};
	clipboardDocument.addEventListener('copy', listener);
	const ok = clipboardDocument.execCommand('copy');
	clipboardDocument.removeEventListener('copy', listener);
	if (!ok) {
		throw new Error('Clipboard copy disallowed');
	}
}
