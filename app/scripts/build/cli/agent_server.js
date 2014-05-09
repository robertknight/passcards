/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/urlrouter/urlrouter.d.ts" />
var child_process = require('child_process');
var fs = require('fs');
var http = require('http');
var path = require('path');
var Q = require('q');
var urlrouter = require('urlrouter');

var consoleio = require('../lib/console');
var crypto = require('../lib/onepass_crypto');
var streamutil = require('../lib/streamutil');

exports.AGENT_LOG = '/tmp/1pass-agent.log';
exports.AGENT_PID_FILE = '/tmp/1pass-agent.pid';

var KEY_TIMEOUT = 2 * 60 * 1000;

function currentVersion() {
    return fs.statSync(__filename).mtime.toString();
}

function logf(format) {
    var args = [];
    for (var _i = 0; _i < (arguments.length - 1); _i++) {
        args[_i] = arguments[_i + 1];
    }
    consoleio.printf.apply(null, [new consoleio.ConsoleIO, format].concat(args));
}

function parseJSONRequest(req, rsp, cb) {
    streamutil.readJSON(req).then(cb).fail(function (err) {
        console.log(err);
        rsp.statusCode = 400;
        rsp.end('Failed to parse request: ' + err);
    }).done();
}

var Server = (function () {
    function Server() {
        var _this = this;
        this.crypto = new crypto.CryptoJsCrypto();
        this.keys = {};

        var self = this;
        var router = urlrouter(function (app) {
            app.post('/keys', function (req, res) {
                parseJSONRequest(req, res, function (params) {
                    logf('received key %s', params.id);
                    _this.keys[params.id] = params.key;
                    res.end('Key added');

                    self.resetKeyTimeout();
                });
            });
            app.get('/keys', function (req, res) {
                res.end(JSON.stringify(Object.keys(_this.keys)));
            });
            app.post('/decrypt', function (req, res) {
                parseJSONRequest(req, res, function (params) {
                    if (!_this.keys.hasOwnProperty(params.id)) {
                        logf('Decrypt failed - unknown key %s', params.id);
                        res.statusCode = 404;
                        res.end('No such key found');
                    }
                    switch (params.algo) {
                        case 'aes-128-openssl':
                            var plainText = crypto.decryptAgileKeychainItemData(_this.crypto, _this.keys[params.id], params.salt, params.cipherText);

                            logf('Decrypted (%d => %d) bytes with key %s', params.cipherText.length, plainText.length, params.id);

                            self.resetKeyTimeout();

                            res.end(plainText);
                            break;
                        default:
                            logf('Decrypt failed - unknown algorithm');
                            res.statusCode = 400;
                            res.end('Unsupported encryption algorithm');
                    }
                });
            });
            app.delete('/keys', function (req, res) {
                logf('forgetting keys');
                self.keys = {};
                res.end();
            });
            app.get('/version', function (req, res) {
                res.end(currentVersion());
            });
        });
        this.httpServer = http.createServer(router);
    }
    Server.prototype.listen = function (port) {
        var ready = Q.defer();
        this.httpServer.listen(port, function () {
            logf('Agent listening on port %d', port);
            ready.resolve(null);
        });
        return ready.promise;
    };

    Server.prototype.resetKeyTimeout = function () {
        var _this = this;
        if (this.keyTimeout) {
            clearTimeout(this.keyTimeout);
        }
        this.keyTimeout = setTimeout(function () {
            logf('Key timeout expired');
            _this.keys = {};
        }, KEY_TIMEOUT);
    };
    return Server;
})();

function isCurrentVersionRunning() {
    var result = Q.defer();
    var req = http.get({ host: 'localhost', port: 3000, path: '/version' }, function (resp) {
        streamutil.readAll(resp).then(function (content) {
            if (content == currentVersion()) {
                result.resolve(true);
            } else {
                result.resolve(false);
            }
        });
    });
    req.on('error', function () {
        result.resolve(false);
    });
    return result.promise;
}

function agentPID() {
    try  {
        var pid = parseInt(fs.readFileSync(exports.AGENT_PID_FILE).toString());
        return pid;
    } catch (ex) {
        // agent not already running
        return null;
    }
}
exports.agentPID = agentPID;

function launchAgent() {
    var pid = Q.defer();

    var agentOut = fs.openSync(exports.AGENT_LOG, 'a');
    var agentErr = fs.openSync(exports.AGENT_LOG, 'a');

    fs.watchFile(exports.AGENT_PID_FILE, {
        persistent: true,
        interval: 5
    }, function () {
        fs.unwatchFile(exports.AGENT_PID_FILE);
        pid.resolve(exports.agentPID());
    });

    var server = child_process.spawn('node', [path.join(__dirname, 'agent_server')], {
        detached: true,
        stdio: ['ignore', agentOut, agentErr]
    });
    server.on('error', function (err) {
        console.log(err);
    });
    server.unref();

    return pid.promise;
}

function startAgent() {
    var existingPID = exports.agentPID();
    if (existingPID) {
        var pid = Q.defer();
        isCurrentVersionRunning().then(function (isCurrent) {
            if (isCurrent) {
                pid.resolve(existingPID);
            } else {
                exports.stopAgent().then(launchAgent).then(function (newVersionPID) {
                    pid.resolve(newVersionPID);
                });
            }
        }).done();
        return pid.promise;
    } else {
        return launchAgent();
    }
}
exports.startAgent = startAgent;

function stopAgent() {
    var pid = exports.agentPID();
    if (!pid) {
        return Q.resolve(null);
    }
    try  {
        process.kill(pid);
    } catch (ex) {
        if (ex.code == 'ESRCH') {
            // no such process
            return Q.resolve(null);
        }
        return Q.reject('Failed to stop agent:' + ex);
    }
    return Q.resolve(null);
}
exports.stopAgent = stopAgent;

if (require.main === module) {
    var server = new Server();
    server.listen(3000).then(function () {
        fs.writeFileSync(exports.AGENT_PID_FILE, process.pid);
    });
}
//# sourceMappingURL=agent_server.js.map
