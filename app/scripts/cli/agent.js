/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
var http = require('http');
var Q = require('q');

var agent_server = require('./agent_server');

var streamutil = require('../lib/streamutil');

var HttpKeyAgent = (function () {
    function HttpKeyAgent() {
        this.agentPID = agent_server.startAgent();
    }
    HttpKeyAgent.prototype.addKey = function (id, key) {
        var done = Q.defer();
        this.sendRequest('POST', '/keys', {
            id: id,
            key: key
        }).then(function (reply) {
            done.resolve(null);
        }).done();
        return done.promise;
    };

    HttpKeyAgent.prototype.listKeys = function () {
        var keys = Q.defer();
        this.sendRequest('GET', '/keys', {}).then(function (reply) {
            keys.resolve(JSON.parse(reply));
        }).done();
        return keys.promise;
    };

    HttpKeyAgent.prototype.forgetKeys = function () {
        var done = Q.defer();
        this.sendRequest('DELETE', '/keys', {}).then(function () {
            done.resolve(null);
        }).done();
        return done.promise;
    };

    HttpKeyAgent.prototype.decrypt = function (id, cipherText, params) {
        var plainText = Q.defer();
        this.sendRequest('POST', '/decrypt', {
            id: id,
            algo: 'aes-128-openssl',
            salt: params.salt,
            cipherText: cipherText
        }).then(function (result) {
            plainText.resolve(result);
        }).done();
        return plainText.promise;
    };

    HttpKeyAgent.prototype.sendRequest = function (method, path, data) {
        var response = Q.defer();
        var dispatchRequest = function () {
            var request = http.request({
                method: method,
                path: path,
                host: 'localhost',
                port: 3000
            }, function (resp) {
                streamutil.readAll(resp).then(function (content) {
                    if (resp.statusCode == 200) {
                        response.resolve(content);
                    } else {
                        response.reject({ status: resp.statusCode, body: content });
                    }
                }, function (err) {
                    response.reject(err);
                }).done();
            });
            request.write(JSON.stringify(data));
            request.end();

            request.on('error', function (err) {
                response.reject(err);
            });
        };

        this.agentPID.then(function () {
            dispatchRequest();
        });

        return response.promise;
    };
    return HttpKeyAgent;
})();
exports.HttpKeyAgent = HttpKeyAgent;
//# sourceMappingURL=agent.js.map
