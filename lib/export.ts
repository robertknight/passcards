/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

import Q = require('q');
import onepass = require('./onepass');
import vfs = require('./vfs/vfs');

export interface Exporter {
	exportItems(fs: vfs.VFS, path: string, items: onepass.Item[]) : Q.Promise<boolean>;
}

export interface Importer {
	importItems(fs: vfs.VFS, path: string) : Q.Promise<onepass.Item[]>
}

/** Exporter for 1Password's .1pif format */
export class PIFExporter implements Exporter {
	exportItems(fs: vfs.VFS, path: string, items: onepass.Item[]) : Q.Promise<boolean> {
		return Q.reject("not implemented");
	}
};

/** Importer for 1Password's .1pif format */
export class PIFImporter {
	importItems(fs: vfs.VFS, path: string) : Q.Promise<onepass.Item[]> {
		var content = fs.read(path);
		return content.then((content) => {
			// .1pif files contain unencrypted JSON blobs separated by
			// '***<uuid>***' markers
			var re = /\*{3}[0-9a-f\-]{36}\*{3}/
			var items : onepass.Item[] = content
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

