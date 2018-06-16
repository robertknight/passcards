import Dropbox = require('dropbox');

import * as vfs from './vfs';

export const CLIENT_ID = '3lq6pyowxfvad8z';

// Additional properties for the filesDownload() response which are missing
// from the typings
interface FileContent extends DropboxTypes.files.FileMetadata {
    fileBlob: Blob;
}

function convertMetadata(m: DropboxTypes.files.Metadata): vfs.FileInfo {
    let meta: vfs.FileInfo = {
        name: m.name,
        path: m.path_display,
        isDir: m['.tag'] === 'folder',
        lastModified: null as Date,
    };

    if (m['.tag'] === 'file') {
        const fm = m as DropboxTypes.files.FileMetadata;
        meta.size = fm.size;
        meta.revision = fm.rev;
        meta.lastModified = new Date(fm.server_modified);
    }

    return meta;
}

// Methods of the Dropbox class which are missing from the typings.
// See http://dropbox.github.io/dropbox-sdk-js/Dropbox.html
interface DropboxJS extends Dropbox {
    getAccessToken(): string;
    setAccessToken(token: string): void;
    getAuthenticationUrl(redirectUri: string, state?: string): string;
}

export class DropboxVFS implements vfs.VFS {
    private client: DropboxJS;

    constructor() {
        this.client = new Dropbox({
            accessToken: null,
            clientId: CLIENT_ID,
            selectUser: '', // Unused, but incorrectly marked as required in typings
        }) as DropboxJS;
    }

    accountInfo(): Promise<vfs.AccountInfo> {
        return this.client.usersGetCurrentAccount(null).then(act => ({
            userId: act.account_id,
            name: act.name.display_name,
            email: act.email,
        }));
    }

    credentials(): vfs.Credentials {
        return { accessToken: this.client.getAccessToken() };
    }

    setCredentials(credentials: vfs.Credentials): void {
        this.client.setAccessToken(credentials.accessToken);
    }

    authURL(redirectUri: string, state?: string): string {
        return this.client.getAuthenticationUrl(redirectUri, state);
    }

    stat(path: string): Promise<vfs.FileInfo> {
        return this.client
            .filesGetMetadata({
                path,
                include_deleted: false,
                include_has_explicit_shared_members: false,
                include_media_info: false,
            })
            .then(convertMetadata);
    }

    search(
        namePattern: string,
        cb: (err: Error, files: vfs.FileInfo[]) => any
    ): void {
        this.client
            .filesSearch({
                path: '',
                query: namePattern,
                start: 0,
                max_results: 100,
                mode: {
                    '.tag': 'filename',
                },
            })
            .then((result: DropboxTypes.files.SearchResult) => {
                // FIXME - If there are multiple pages of results, return subsequent pages
                // as well
                const files = result.matches.map(match =>
                    convertMetadata(match.metadata)
                );
                cb(null, files);
            })
            .catch(err => cb(err, []));
    }

    read(path: string): Promise<string> {
        return this.client.filesDownload({ path }).then(metadata => {
            return new Promise<string>(resolve => {
                let reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                const content = (metadata as FileContent).fileBlob;

                // FileReader#readAsBinaryString() is non-standard but
                // supported by all major browsers.
                reader.readAsBinaryString(content);
            });
        });
    }

    write(
        path: string,
        contents: string,
        options?: vfs.WriteOptions
    ): Promise<vfs.FileInfo> {
        let writeMode: DropboxTypes.files.WriteMode;

        if (options && options.parentRevision) {
            writeMode = { '.tag': 'update', update: options.parentRevision };
        } else {
            writeMode = { '.tag': 'overwrite' };
        }

        return this.client
            .filesUpload({
                autorename: false,
                mute: false,
                path,
                contents,
                mode: writeMode,
            })
            .then(convertMetadata);
    }

    list(path: string): Promise<vfs.FileInfo[]> {
        let metadata: vfs.FileInfo[] = [];

        let listDir: (cursor?: string) => Promise<vfs.FileInfo[]>;
        listDir = (cursor?: string) => {
            let result: Promise<DropboxTypes.files.ListFolderResult>;
            if (cursor) {
                result = this.client.filesListFolderContinue({ cursor });
            } else {
                result = this.client.filesListFolder({
                    include_deleted: false,
                    include_has_explicit_shared_members: false,
                    include_media_info: false,
                    path,
                    recursive: false,
                });
            }
            return result.then(res => {
                metadata = metadata.concat(res.entries.map(convertMetadata));
                if (res.has_more) {
                    return listDir(res.cursor);
                } else {
                    return metadata;
                }
            });
        };

        return listDir().then(() => {
            return metadata;
        });
    }

    rm(path: string) {
        return this.client.filesDelete({ path }) as Promise<undefined>;
    }

    mkpath(path: string) {
        return this.client.filesCreateFolder({ path }) as Promise<undefined>;
    }
}
