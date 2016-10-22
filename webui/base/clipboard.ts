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
	document.addEventListener('copy', listener);
	const ok = document.execCommand('copy');
	document.removeEventListener('copy', listener);
	if (!ok) {
		throw new Error('Clipboard copy disallowed');
	}
}
