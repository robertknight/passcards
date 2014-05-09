/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
var Q = require('q');

function readAll(readable) {
    var result = Q.defer();
    var body = '';
    readable.on('data', function (chunk) {
        body += chunk;
    });
    readable.on('end', function () {
        result.resolve(body);
    });
    return result.promise;
}
exports.readAll = readAll;

function readJSON(readable) {
    return exports.readAll(readable).then(function (content) {
        return Q.resolve(JSON.parse(content));
    });
}
exports.readJSON = readJSON;
//# sourceMappingURL=streamutil.js.map
