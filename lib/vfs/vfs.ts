
import Q = require('q');

import err_util = require('../base/err_util');

/** Holds details of a file retrieved by a VFS implementation */
export interface FileInfo {
	name: string;
	path: string;
	isDir: boolean;

	/** The current version of the file. */
	revision?: string;

	/** The last modified timestamp for the file. */
	lastModified: Date;

	/** The size of the file in bytes. */
	size: number;
}

export interface AccountInfo {
	userId: string;
	email: string;
	name: string;
}

export interface WriteOptions {
	/** The revision of the file that the client
	  * is expecting to update. If this is specified
	  * and does not match the current version of
	  * the file then the write will fail.
	  */
	parentRevision?: string;
}

/** Object containing the login credentials for an account
 */
export interface Credentials extends Object {
	/** Access token for services using OAuth */
	accessToken?: string;
}

export enum ErrorType {
	Conflict,
	FileNotFound,
	AuthError,
	Other
}

export class VfsError extends err_util.BaseError {
	private _type: ErrorType;

	constructor(type: ErrorType, message: string) {
		super(message);

		this._type = type;
	}

	get type() {
		return this._type;
	}
}

/** Interface for async file system access.
 */
export interface VFS {
	/** Returns the name of the account which the user is logged in to */
	accountInfo(): Q.Promise<AccountInfo>;
	/** Returns credentials for the logged in account.
	 * This is an opaque object which can later be restored.
	 */
	credentials(): Credentials;
	/** Sets the login credentials */
	setCredentials(credentials: Credentials): void;

	/** Returns the URL for the authorization endpoint for this file system, if any. */
	authURL? (): string;

	/** Returns the metadata of the file at the given path */
	stat(path: string): Q.Promise<FileInfo>;
	/** Search for files whose name contains @p namePattern */
	search(namePattern: string, cb: (err: Error, files: FileInfo[]) => any): void;
	/** Read the contents of a file at @p path */
	read(path: string): Q.Promise<string>
	/** Write the contents of a file at @p path */
	write(path: string, content: string, options?: WriteOptions): Q.Promise<FileInfo>;
	/** List the contents of a directory */
	list(path: string): Q.Promise<FileInfo[]>;
	/** Remove a file or directory */
	rm(path: string): Q.Promise<void>;
	/** Create the directory @p path, creating any parent directories
	  * that do not already exist if necessary.
	  *
	  * Fails with an error if @p path already exists.
	  */
	mkpath(path: string): Q.Promise<void>;
}
