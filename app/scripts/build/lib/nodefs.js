var fs = require('fs');
var mkdirp = require('mkdirp');
var Path = require('path');
var Q = require('q');

var vfs = require('./vfs');

/** VFS implementation which operates on the local filesystem */
var FileVFS = (function () {
    function FileVFS(_root) {
        this.root = _root;
    }
    FileVFS.prototype.stat = function (path) {
        var _this = this;
        var result = Q.defer();
        fs.stat(this.absPath(path), function (err, info) {
            if (err) {
                result.reject(err);
                return;
            }
            var fileInfo = new vfs.FileInfo;
            fileInfo.name = Path.basename(path);
            fileInfo.path = _this.absPath(path);
            fileInfo.isDir = info.isDirectory();
            result.resolve(fileInfo);
        });
        return result.promise;
    };

    FileVFS.prototype.searchIn = function (path, namePattern, cb) {
        var _this = this;
        var fileList = this.list(path);
        fileList.then(function (files) {
            files.forEach(function (file) {
                if (file.name.indexOf(namePattern) != -1) {
                    cb([file]);
                }

                if (file.isDir) {
                    _this.searchIn(file.path, namePattern, cb);
                }
            });
        }, function (error) {
            throw error;
        }).done();
    };

    FileVFS.prototype.search = function (namePattern, cb) {
        this.searchIn('', namePattern, cb);
    };

    FileVFS.prototype.read = function (path) {
        var result = Q.defer();
        fs.readFile(this.absPath(path), function (error, content) {
            if (error) {
                result.reject(error);
                return;
            }
            result.resolve(content.toString('binary'));
        });
        return result.promise;
    };

    FileVFS.prototype.write = function (path, content) {
        var result = Q.defer();
        fs.writeFile(this.absPath(path), content, function (error) {
            if (error) {
                result.reject(error);
                return;
            }
            result.resolve(null);
        });
        return result.promise;
    };

    FileVFS.prototype.list = function (path) {
        var result = Q.defer();
        var absPath = this.absPath(path);
        fs.readdir(absPath, function (err, files) {
            if (err) {
                result.reject(err);
                return;
            }

            var done = 0;
            var infoList = [];
            files.forEach(function (name) {
                var filePath = Path.join(absPath, name);
                fs.stat(filePath, function (err, info) {
                    if (err) {
                        console.log('Unable to stat ' + filePath);
                        return;
                    }

                    var fi = new vfs.FileInfo;
                    fi.name = name;
                    fi.path = filePath;
                    fi.isDir = info.isDirectory();

                    infoList.push(fi);
                    ++done;
                    if (done == files.length) {
                        result.resolve(infoList);
                    }
                });
            });
        });
        return result.promise;
    };

    FileVFS.prototype.rm = function (path) {
        var result = Q.defer();
        fs.unlink(this.absPath(path), function (error) {
            if (error) {
                result.reject(error);
                return;
            }
            result.resolve(null);
        });
        return result.promise;
    };

    FileVFS.prototype.login = function () {
        return Q.resolve(process.env.USER);
    };

    FileVFS.prototype.isLoggedIn = function () {
        return true;
    };

    FileVFS.prototype.credentials = function () {
        return {};
    };

    FileVFS.prototype.setCredentials = function (credentials) {
        // unused
    };

    FileVFS.prototype.mkpath = function (path) {
        var result = Q.defer();
        mkdirp(this.absPath(path), function (err, made) {
            if (err) {
                result.reject(err);
                return;
            }
            result.resolve(null);
        });
        return result.promise;
    };

    FileVFS.prototype.absPath = function (path) {
        if (path.indexOf(this.root) != 0) {
            return Path.join(this.root, path);
        } else {
            return path;
        }
    };
    return FileVFS;
})();
exports.FileVFS = FileVFS;
//# sourceMappingURL=nodefs.js.map
