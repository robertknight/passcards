/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
var Q = require('q');

/** Holds details of a file retrieved by a VFS implementation */
var FileInfo = (function () {
    function FileInfo() {
    }
    return FileInfo;
})();
exports.FileInfo = FileInfo;


/** Utility functions for virtual file system operations,
* built on top of the main VFS interface methods.
*/
var VFSUtil = (function () {
    function VFSUtil() {
    }
    /** Remove the directory @p path and all of its contents, if it exists. */
    VFSUtil.rmrf = function (fs, path) {
        var result = Q.defer();

        fs.stat(path).then(function () {
            var fileList = fs.list(path);
            var removeOps = [];
            fileList.then(function (files) {
                files.forEach(function (file) {
                    if (file.isDir) {
                        removeOps.push(VFSUtil.rmrf(fs, file.path));
                    } else {
                        removeOps.push(fs.rm(file.path));
                    }
                });
            }).done();

            removeOps.push(fileList);
            Q.all(removeOps).then(function () {
                result.resolve(null);
            }, function (err) {
                result.reject(err);
            }).done();
        }, function (err) {
            // TODO - Only resolve the promise if
            // the error is that the file does not exist
            result.resolve(null);
        }).done();

        return result.promise;
    };
    return VFSUtil;
})();
exports.VFSUtil = VFSUtil;
//# sourceMappingURL=vfs.js.map
