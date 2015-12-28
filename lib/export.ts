
import Q = require('q');

import item_store = require('./item_store');
import onepass = require('./agile_keychain');
import vfs = require('./vfs/vfs');

export interface Exporter {
	exportItems(fs: vfs.VFS, path: string, items: item_store.Item[]): Q.Promise<boolean>;
}

export interface Importer {
	importItems(fs: vfs.VFS, path: string): Q.Promise<item_store.Item[]>
}

/** Exporter for 1Password's .1pif format */
export class PIFExporter implements Exporter {
	exportItems(fs: vfs.VFS, path: string, items: item_store.Item[]): Q.Promise<boolean> {
		return Q.reject<boolean>("not implemented");
	}
};

/** Importer for 1Password's .1pif format */
export class PIFImporter {
	importItems(fs: vfs.VFS, path: string): Q.Promise<item_store.Item[]> {
		var content = fs.read(path);
		return content.then((content) => {
			// .1pif files contain unencrypted JSON blobs separated by
			// '***<uuid>***' markers
			var re = /\*{3}[0-9a-f\-]{36}\*{3}/
			var items: item_store.Item[] = content
			.split(re)
			.filter((blob) => {
				return blob.trim().length > 0;
			})
			.map((text) => {
				var json = JSON.parse(text);
				return onepass.fromAgileKeychainItem(null, json);
			});

			return items;
		});
	}
};
