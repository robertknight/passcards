/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
var child_process = require('child_process');
var os = require('os');

var Q = require('q');

var FakeClipboard = (function () {
    function FakeClipboard() {
        this.data = '';
    }
    FakeClipboard.prototype.setData = function (content) {
        this.data = content;
        return Q.resolve(null);
    };

    FakeClipboard.prototype.getData = function () {
        return Q.resolve(this.data);
    };

    FakeClipboard.prototype.clear = function () {
        this.data = '';
        return Q.resolve(null);
    };
    return FakeClipboard;
})();
exports.FakeClipboard = FakeClipboard;

// run an external command, feeding it 'input' if non-null and return
// a promise for the output
function exec(command, input) {
    var stdout = Q.defer();
    var child = child_process.exec(command, function (err, _stdout, stderr) {
        if (err) {
            stdout.reject(err);
            return;
        }
        stdout.resolve(_stdout.toString());
    });
    if (typeof input != 'undefined') {
        child.stdin.write(input);
        child.stdin.end();
        child.stdin.on('error', function (err) {
            stdout.reject(err);
        });
    }
    return stdout.promise;
}

function discardResult(promise) {
    return promise.then(function () {
        return (null);
    });
}

var X11Clipboard = (function () {
    function X11Clipboard() {
    }
    // TODO - Improve error handling if xsel is not installed
    X11Clipboard.prototype.setData = function (content) {
        return discardResult(exec('xsel --clipboard --input', content));
    };

    X11Clipboard.prototype.getData = function () {
        return exec('xsel --clipboard --output');
    };

    X11Clipboard.prototype.clear = function () {
        return discardResult(exec('xsel --clipboard --clear'));
    };
    return X11Clipboard;
})();
exports.X11Clipboard = X11Clipboard;

var MacClipboard = (function () {
    function MacClipboard() {
    }
    MacClipboard.prototype.setData = function (content) {
        return discardResult(exec('pbcopy', content));
    };

    MacClipboard.prototype.getData = function () {
        return exec('pbpaste');
    };

    MacClipboard.prototype.clear = function () {
        return discardResult(exec('pbcopy', ''));
    };
    return MacClipboard;
})();
exports.MacClipboard = MacClipboard;

function createPlatformClipboard() {
    if (os.type() == 'Linux' && process.env.DISPLAY) {
        return new X11Clipboard();
    } else if (os.type() == 'Darwin') {
        return new MacClipboard();
    } else {
        return new FakeClipboard();
    }
}
exports.createPlatformClipboard = createPlatformClipboard;
//# sourceMappingURL=clipboard.js.map
