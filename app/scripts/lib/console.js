/// <reference path="../typings/DefinitelyTyped/promptly/promptly.d.ts" />
/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/sprintf.d.ts" />
var promptly = require('promptly');
var sprintf = require('sprintf');
var Q = require('q');


var ConsoleIO = (function () {
    function ConsoleIO() {
    }
    ConsoleIO.prototype.print = function (text) {
        console.log(text);
    };

    ConsoleIO.prototype.readPassword = function (prompt) {
        var result = Q.defer();
        promptly.password(prompt, function (err, password) {
            if (err) {
                result.reject(err);
                return;
            }
            result.resolve(password);
        });
        return result.promise;
    };
    return ConsoleIO;
})();
exports.ConsoleIO = ConsoleIO;

function prettyJSON(obj) {
    return JSON.stringify(obj, null, 2);
}
exports.prettyJSON = prettyJSON;

function printf(out, format) {
    var args = [];
    for (var _i = 0; _i < (arguments.length - 2); _i++) {
        args[_i] = arguments[_i + 2];
    }
    out.print(sprintf.apply(null, [format].concat(args)));
}
exports.printf = printf;
//# sourceMappingURL=console.js.map
