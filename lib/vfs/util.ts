import Path = require('path');
import vfs = require('./vfs');

/** Utility functions for virtual file system operations,
  * built on top of the main vfs.VFS interface methods.
  */

/** Remove the directory @p path and all of its contents, if it exists. */
export function rmrf(fs: vfs.VFS, path: string): Promise<void> {
    return fs
        .stat(path)
        .then(() => {
            return fs.list(path);
        })
        .catch(err => {
            if (err.type === vfs.ErrorType.FileNotFound) {
                return [];
            } else {
                throw err;
            }
        })
        .then((files: vfs.FileInfo[]) => {
            var filesRemoved = files.map(
                file => (file.isDir ? rmrf(fs, file.path) : fs.rm(file.path))
            );
            return Promise.all(filesRemoved);
        })
        .then(() => fs.rm(path))
        .catch(err => {
            if (err.type !== vfs.ErrorType.FileNotFound) {
                throw err;
            }
        });
}

/** Recursively enumerate the contents of @p path */
export function listRecursive(
    fs: vfs.VFS,
    src: string
): Promise<vfs.FileInfo[]> {
    return fs
        .list(src)
        .then(files => {
            var subdirLists = files.map(
                file =>
                    file.isDir
                        ? listRecursive(fs, file.path)
                        : Promise.resolve([file])
            );
            return Promise.all(subdirLists);
        })
        .then(subdirFiles => {
            return subdirFiles.reduce((allFiles, f) => allFiles.concat(f), []);
        });
}

/** Copy the directory @p path and all of its contents to a new location */
export function cp(fs: vfs.VFS, src: vfs.FileInfo, dest: string): Promise<{}> {
    if (src.isDir) {
        return fs
            .mkpath(dest)
            .then(() => {
                return fs.list(src.path);
            })
            .then((srcFiles: vfs.FileInfo[]) => {
                var copyOps: Promise<{}>[] = [];
                srcFiles.forEach(srcFile => {
                    var destPath = dest + '/' + srcFile.name;
                    copyOps.push(cp(fs, srcFile, destPath));
                });
                return Promise.all(copyOps);
            });
    } else {
        return fs.read(src.path).then(content => {
            return fs.write(dest, content);
        });
    }
}

/** Search a file system for files whose name matches a given pattern,
  * using vfs.VFS.list() recursively.
  *
  * vfs.VFS.search() should be used by clients instead of this method as
  * some vfs.VFS implementations may use a faster method.
  */
export function searchIn(
    fs: vfs.VFS,
    path: string,
    namePattern: string,
    cb: (error: Error, files: vfs.FileInfo[]) => any
): void {
    var fileList = fs.list(path);
    fileList
        .then(files => {
            files.forEach(file => {
                if (file.name.indexOf(namePattern) != -1) {
                    cb(null, [file]);
                }

                if (file.isDir) {
                    searchIn(fs, file.path, namePattern, cb);
                }
            });
        })
        .catch(err => cb(err, null));
}

export function mktemp(
    fs: vfs.VFS,
    path: string,
    template = 'tmp.XXX'
): Promise<string> {
    var baseName = template.replace(/X{3,}/, match => {
        var randomized = '';
        for (var i = 0; i < match.length; i++) {
            randomized += String.fromCharCode(
                97 /* 'a' */ + Math.round(Math.random() * 25)
            );
        }
        return randomized;
    });

    var tempPath = Path.join(path, baseName);
    return fs.mkpath(tempPath).then(() => {
        return tempPath;
    });
}

/** Read and parse the contents of a JSON file and return
  * the result as an object of type T
  */
export function readJSON<T>(fs: vfs.VFS, path: string) {
    return fs.read(path).then(json => <T>JSON.parse(json));
}
