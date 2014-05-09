/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/dropbox.d.ts" />
var dropbox = require('dropbox');
var vfs = require('./vfs');
var Q = require('q');

var DropboxVFS = (function () {
    function DropboxVFS() {
        var apiKeys = { "key": "3lq6pyowxfvad8z" };
        this.client = new dropbox.Client(apiKeys);
        this.client.onError.addListener(function (error) {
            console.log(error);
        });
    }
    DropboxVFS.prototype.login = function () {
        var account = Q.defer();
        console.log('Logging into Dropbox...');
        this.client.authenticate(function (err, accountID) {
            if (err) {
                console.log('Dropbox login failed');
                account.reject(err);
                return;
            }
            account.resolve(accountID);
        });
        return account.promise;
    };

    DropboxVFS.prototype.isLoggedIn = function () {
        return this.client.isAuthenticated();
    };

    DropboxVFS.prototype.stat = function (path) {
        var _this = this;
        var result = Q.defer();
        this.client.stat(path, {}, function (err, stat) {
            if (err) {
                result.reject(err);
                return;
            }
            result.resolve(_this.toVfsFile(stat));
        });
        return result.promise;
    };

    DropboxVFS.prototype.search = function (namePattern, cb) {
        var _this = this;
        this.client.search('/', namePattern, {}, function (err, files) {
            var fileList = [];
            files.forEach(function (file) {
                fileList.push(_this.toVfsFile(file));
            });
            cb(fileList);
        });
    };

    DropboxVFS.prototype.read = function (path) {
        var result = Q.defer();
        this.client.readFile(path, {}, function (error, content) {
            if (error) {
                result.reject(error);
                return;
            }
            result.resolve(content);
        });
        return result.promise;
    };

    DropboxVFS.prototype.write = function (path, content) {
        var result = Q.defer();
        this.client.writeFile(path, content, {}, function (error) {
            if (error) {
                result.reject(error);
                return;
            }
            result.resolve(null);
        });
        return result.promise;
    };

    DropboxVFS.prototype.list = function (path) {
        var _this = this;
        var result = Q.defer();
        this.client.readdir(path, {}, function (error, names, folderInfo, files) {
            if (error) {
                result.reject(error);
                return;
            }
            var fileList = [];
            files.forEach(function (file) {
                fileList.push(_this.toVfsFile(file));
            });
            result.resolve(fileList);
        });
        return result.promise;
    };

    DropboxVFS.prototype.rm = function (path) {
        var result = Q.defer();
        this.client.remove(path, function (error) {
            if (error) {
                result.reject(error);
                return;
            }
            result.resolve(null);
        });
        return result.promise;
    };

    DropboxVFS.prototype.credentials = function () {
        return this.client.credentials();
    };

    DropboxVFS.prototype.setCredentials = function (credentials) {
        this.client.setCredentials(credentials);
    };

    DropboxVFS.prototype.mkpath = function (path) {
        var result = Q.defer();
        this.client.mkdir(path, function (err, stat) {
            if (err) {
                result.reject(err);
                return;
            }
            result.resolve(null);
        });
        return result.promise;
    };

    DropboxVFS.prototype.toVfsFile = function (file) {
        var fileInfo = new vfs.FileInfo;
        fileInfo.name = file.name;
        fileInfo.path = file.path;
        fileInfo.isDir = file.isFolder;
        return fileInfo;
    };
    return DropboxVFS;
})();
exports.DropboxVFS = DropboxVFS;
//# sourceMappingURL=dropboxvfs.js.map
