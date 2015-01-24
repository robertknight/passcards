/// <reference path="../../typings/DefinitelyTyped/node-uuid/node-uuid.d.ts" />

import Path = require('path');
import Q = require('q');
import uuid = require('node-uuid');
import underscore = require('underscore');

import assert = require('assert');
import stringutil = require('../base/stringutil');
import vfs = require('./vfs');

interface FSEntry {
	// filename of this entry
	name: string;
	// file type of this entry
	isDir: boolean;
	// modification time for this entry,
	// stored as msecs since the Unix epoch
	mtime?: number;
	// key in the key/value store
	// for the file's content or directory index.
	//
	// This will be set for the entry for '/' and all file
	// entries. It may be null for directory entries where
	// the data is stored as part of a parent entry
	key?: string;
	// list of files in this directory (only when isDir is true)
	entries?: FSEntry[];
	// the parent entry for this item, null for the root entry
	parent?: FSEntry;
}

export class FS implements vfs.VFS {
	private rootKey : string;
	private root : FSEntry;
	private storage : Storage;

	constructor(rootKey: string, storage?: Storage) {
		this.rootKey = rootKey;
		this.storage = storage || window.localStorage;
	}

	login() : Q.Promise<string> {
		return Q('');
	}

	isLoggedIn() : boolean {
		return true;
	}

	accountInfo(): Q.Promise<vfs.AccountInfo> {
		return Q.reject<vfs.AccountInfo>(new Error('Not implemented'));
	}

	credentials() : Object {
		return {}
	}

	setCredentials(credentials: Object) : void {
		// unused
	}

	stat(path: string) : Q.Promise<vfs.FileInfo> {
		var entry = this.entryForPath(path);
		if (!entry) {
			return Q.reject<vfs.FileInfo>(new Error('No such path'));
		} else {
			return Q(FS.fsEntryToFileInfo(entry));
		}
	}

	search(namePattern: string, cb: (error: Error, files: vfs.FileInfo[]) => any) : void {
		vfs.VFSUtil.searchIn(this, '.', namePattern, cb);
	}

	read(path: string) : Q.Promise<string> {
		var entry = this.entryForPath(path);
		if (!entry) {
			return Q.reject<string>(new Error('No such path'));
		}
		if (entry.isDir) {
			return Q.reject<string>(new Error('Entry is a directory'));
		}
		if (!entry.key) {
			return Q.reject<string>(new Error('Entry has no content'));
		}
		return Q(this.storage.getItem(entry.key));
	}

	write(path: string, content: string, options: vfs.WriteOptions = {}) : Q.Promise<void> {
		var entry = this.entryForPath(path);
		if (!entry) {
			// create a new file entry for this path
			entry = {
				name: Path.basename(path),
				isDir: false,
				key: this.newItemKey()
			}
			var parentDirEntry = this.entryForPath(Path.dirname(path));
			if (!parentDirEntry) {
				return Q.reject<void>(new Error('Directory does not exist'));
			}
			entry.parent = parentDirEntry;
			parentDirEntry.entries.push(entry);
		}

		var parentRev: number;
		if (options.parentRevision) {
			parentRev = parseInt(options.parentRevision);
		}

		if (options.parentRevision && entry.mtime && entry.mtime !== parentRev) {
			return Q.reject<void>(new vfs.ConflictError(path));
		}

		assert(entry.parent);

		entry.mtime = Date.now();

		if (parentRev == entry.mtime) {
			// if multiple saves happen in a short time period, force the clock
			// forwards
			++entry.mtime;
		}

		this.writeDirIndex(entry.parent);

		this.storage.setItem(entry.key, content);
		return Q<void>(null);
	}

	list(path: string) : Q.Promise<vfs.FileInfo[]> {
		var entry = this.entryForPath(path);
		if (!entry) {
			return Q.reject<vfs.FileInfo[]>(new Error('No such directory: ' + path));
		}
		if (!entry.isDir) {
			return Q.reject<vfs.FileInfo[]>(new Error('Entry is not a directory'));
		}
		return Q(underscore.map(entry.entries, (entry) => {
			return FS.fsEntryToFileInfo(entry);
		}));
	}

	rm(path: string) : Q.Promise<void> {
		var entry = this.entryForPath(path);
		if (!entry) {
			return Q<void>(null);
		}

		var removeEntry = (entry: FSEntry) => {
			if (entry.isDir) {
				entry.entries.forEach((entry) => {
					removeEntry(entry);
				});
			} else {
				this.storage.removeItem(entry.key);
				entry.key = null;
			}

			entry.parent.entries = underscore.filter(entry.parent.entries, (sibling) => {
				return sibling != entry;
			});
			this.writeDirIndex(entry.parent);
		};
		removeEntry(entry);
	}

	mkpath(path: string) : Q.Promise<void> {
		var components = path.split('/');
		var currentPath = '';
		var prevDirEntry = this.entryForPath('/');

		components.forEach((component) => {
			currentPath += '/' + component;

			var dirEntry = this.entryForPath(currentPath);
			if (!dirEntry) {
				dirEntry = <FSEntry>{
					name : component,
					isDir : true,
					entries : [],
					parent : prevDirEntry
				};
				prevDirEntry.entries.push(dirEntry);
				this.writeDirIndex(prevDirEntry);
			} else if (!dirEntry.isDir) {
				return Q.reject(currentPath + ' exists and is not a directory');
			}

			prevDirEntry = dirEntry;
		});
		return Q<void>(null);
	}

	private updateParent(entries: FSEntry[], parent: FSEntry) {
		entries.forEach((entry) => {
			entry.parent = parent;
			if (entry.entries) {
				this.updateParent(entry.entries, entry);
			}
		});
	}

	private readDirIndex(parent: FSEntry, key: string) : FSEntry[] {
		var content = this.storage.getItem(key);
		if (!content) {
			return null;
		}
		var entries : FSEntry[] = JSON.parse(content);
		this.updateParent(entries, parent);
		return entries;
	}

	private static toDirIndexEntry(entry: FSEntry) : Object {
		return {
			name: entry.name,
			isDir: entry.isDir,
			entries: underscore.map(entry.entries, (entry) => {
				return FS.toDirIndexEntry(entry);
			}),
			key: entry.key
		};
	}

	private writeDirIndex(entry: FSEntry) {
		var parentWithKey = entry;
		while (!parentWithKey.key) {
			parentWithKey = parentWithKey.parent;
			assert(parentWithKey);
		}

		if (!parentWithKey.isDir) {
			throw 'parentWithKey is not a directory';
		}
		if (!parentWithKey.entries) {
			throw 'parentWithKey has no children';
		}

		var entries = underscore.map(parentWithKey.entries, (entry) => {
			return FS.toDirIndexEntry(entry);
		});
		this.storage.setItem(parentWithKey.key, JSON.stringify(entries));
	}

	// return the 'absolute' (relative to the root of the file system)
	// canonical form of a path in the file system
	private canonicalPath(path: string) : string {
		var components : string[] = [];
		path.split('/').forEach((component) => {
			if (component == '.' || component == '') {
				return;
			} else if (component == '..') {
				if (components.length > 0) {
					components.pop();
				}
			} else {
				components.push(component);
			}
		});

		var canonicalPath = '/' + components.join('/');
		
		return canonicalPath;
	}

	private entryForPath(path: string, parent?: FSEntry, parentPath?: string) : FSEntry {

		path = this.canonicalPath(path);

		if (!this.root) {
			this.root = {
				name: '',
				isDir: true,
				key: this.rootKey,
				parent: null
			}
			this.root.entries = this.readDirIndex(this.root, this.root.key);
			if (!this.root.entries) {
				// create a new index
				this.root.entries = [];
				this.writeDirIndex(this.root);
			}
		}

		if (path == '/') {
			return this.root;
		}

		if (!parent) {
			parent = this.root;
			parentPath = '';
		}

		for (var i=0; i < parent.entries.length; i++) {
			var child = parent.entries[i];
			var childPath = parentPath + '/' + child.name;
			
			if (childPath == path) {
				return child;
			} else if (stringutil.startsWith(path, childPath)) {
				return this.entryForPath(path, child, childPath);
			}
		}

		return null;
	}

	private static fsEntryToFileInfo(entry: FSEntry) {
		var fileInfo = <vfs.FileInfo>{
			name: entry.name,
			isDir: entry.isDir,
			path: entry.name
		};
		if (entry.mtime) {
			fileInfo.revision = entry.mtime.toString();
		}

		var parent = entry.parent;
		while (parent && parent.parent) {
			fileInfo.path = parent.name + '/' + fileInfo.path;
			parent = parent.parent;
		}
		return fileInfo;
	}

	private newItemKey() : string {
		var itemKey = uuid.v4().toUpperCase().replace(/-/g,'');
		return this.rootKey + '/' + itemKey;
	}
}

