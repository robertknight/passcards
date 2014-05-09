/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
var Q = require('q');
var onepass = require('./onepass');

/** Exporter for 1Password's .1pif format */
var PIFExporter = (function () {
    function PIFExporter() {
    }
    PIFExporter.prototype.exportItems = function (fs, path, items) {
        return Q.reject("not implemented");
    };
    return PIFExporter;
})();
exports.PIFExporter = PIFExporter;
;

/** Importer for 1Password's .1pif format */
var PIFImporter = (function () {
    function PIFImporter() {
    }
    PIFImporter.prototype.importItems = function (fs, path) {
        var result = Q.defer();
        var content = fs.read(path);
        content.then(function (content) {
            // .1pif files contain unencrypted JSON blobs separated by
            // '***<uuid>***' markers
            var re = /\*{3}[0-9a-f\-]{36}\*{3}/;
            var items = content.split(re).filter(function (blob) {
                return blob.trim().length > 0;
            }).map(function (text) {
                var json = JSON.parse(text);
                return onepass.Item.fromAgileKeychainObject(null, json);
            });

            result.resolve(items);
        }, function (err) {
            throw err;
        });
        return result.promise;
    };
    return PIFImporter;
})();
exports.PIFImporter = PIFImporter;
;
//# sourceMappingURL=export.js.map
