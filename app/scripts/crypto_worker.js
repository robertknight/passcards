(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var BiDiMap = (function () {
    function BiDiMap() {
        this.entries = [];
    }
    BiDiMap.prototype.add = function (key1, key2) {
        this.entries.push({ key1: key1, key2: key2 });
        return this;
    };
    BiDiMap.prototype.get = function (key1) {
        for (var i = 0; i < this.entries.length; i++) {
            if (this.entries[i].key1 == key1) {
                return this.entries[i].key2;
            }
        }
        return null;
    };
    BiDiMap.prototype.get2 = function (key2) {
        for (var i = 0; i < this.entries.length; i++) {
            if (this.entries[i].key2 == key2) {
                return this.entries[i].key1;
            }
        }
        return null;
    };
    return BiDiMap;
})();
exports.BiDiMap = BiDiMap;
function prettyJSON(object) {
    return JSON.stringify(object, null, 2);
}
exports.prettyJSON = prettyJSON;
function copyBuffer(dest, src) {
    var sharedLength = Math.min(src.length, dest.length);
    for (var i = 0; i < sharedLength; i++) {
        dest[i] = src[i];
    }
}
exports.copyBuffer = copyBuffer;
function hexlify(buf, len) {
    var hex = '';
    var byteBuf = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    len = len || byteBuf.length;
    for (var i = 0; i < len; i++) {
        if (byteBuf[i] < 16) {
            hex += '0';
        }
        hex += byteBuf[i].toString(16);
    }
    return hex;
}
exports.hexlify = hexlify;
;
function bufferFromString(str) {
    var destBuf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
        destBuf[i] = str.charCodeAt(i);
    }
    return destBuf;
}
exports.bufferFromString = bufferFromString;
function stringFromBuffer(buf) {
    var str = '';
    for (var i = 0; i < buf.length; i++) {
        str += String.fromCharCode(buf[i]);
    }
    return str;
}
exports.stringFromBuffer = stringFromBuffer;
function bufferToArray(buffer) {
    var result = [];
    for (var i = 0; i < buffer.length; i++) {
        result.push(buffer[i]);
    }
    return result;
}
exports.bufferToArray = bufferToArray;
function compare(first, second, length) {
    var sharedLength = Math.min(first.length, second.length);
    for (var i = 0; i < sharedLength; i++) {
        var diff = first[i] - second[i];
        if (diff != 0) {
            return diff;
        }
    }
    if (sharedLength > first.length) {
        return -1;
    }
    else if (sharedLength > second.length) {
        return 1;
    }
    else {
        return 0;
    }
}
exports.compare = compare;
var LittleEndianDataView = (function () {
    function LittleEndianDataView(view) {
        this.view = view;
        this.byteLength = view.byteLength;
        this.buffer = view.buffer;
    }
    LittleEndianDataView.prototype.getUint8 = function (offset) {
        return this.view.getUint8(offset);
    };
    LittleEndianDataView.prototype.getUint16 = function (offset) {
        return this.view.getUint16(offset, true);
    };
    LittleEndianDataView.prototype.getUint32 = function (offset) {
        return this.view.getUint32(offset, true);
    };
    LittleEndianDataView.prototype.getInt32 = function (offset) {
        return this.view.getInt32(offset, true);
    };
    LittleEndianDataView.prototype.setInt32 = function (offset, data) {
        this.view.setInt32(offset, data, true);
    };
    LittleEndianDataView.prototype.setUint32 = function (offset, data) {
        this.view.setUint32(offset, data, true);
    };
    return LittleEndianDataView;
})();
exports.LittleEndianDataView = LittleEndianDataView;
//# sourceMappingURL=collectionutil.js.map
},{}],2:[function(require,module,exports){
(function (process){
function isBrowser() {
    return typeof window != 'undefined';
}
exports.isBrowser = isBrowser;
function isNodeJS() {
    return process && process.version;
}
exports.isNodeJS = isNodeJS;
function isWebWorker() {
    return typeof importScripts != 'undefined';
}
exports.isWebWorker = isWebWorker;
function isFirefoxAddon() {
    return isBrowser() && window.location.protocol == 'resource:';
}
exports.isFirefoxAddon = isFirefoxAddon;
//# sourceMappingURL=env.js.map
}).call(this,require("/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":7}],3:[function(require,module,exports){
var collectionutil = require('../base/collectionutil');
var bitsToBytes = function (n) {
    return n >> 3;
};
var bytesToBits = function (n) {
    return n << 3;
};
var roundUp = function (n, denom) {
    return n + (denom - (n % denom)) % denom;
};
var padLength = function (len) {
    return bitsToBytes(roundUp(bytesToBits(len) + 1 + 64, 512));
};
var sha1core = function (stdlib, foreign, heap) {
    var H = new stdlib.Int32Array(heap);
    function hash(k) {
        k = k | 0;
        var i = 0, j = 0, y0 = 0, z0 = 0, y1 = 0, z1 = 0, y2 = 0, z2 = 0, y3 = 0, z3 = 0, y4 = 0, z4 = 0, t0 = 0, t1 = 0;
        y0 = H[k + 0 << 2 >> 2] | 0;
        y1 = H[k + 1 << 2 >> 2] | 0;
        y2 = H[k + 2 << 2 >> 2] | 0;
        y3 = H[k + 3 << 2 >> 2] | 0;
        y4 = H[k + 4 << 2 >> 2] | 0;
        for (i = 0; (i | 0) < (k | 0); i = i + 16 | 0) {
            z0 = y0;
            z1 = y1;
            z2 = y2;
            z3 = y3;
            z4 = y4;
            for (j = 0; (j | 0) < 16; j = j + 1 | 0) {
                t1 = H[i + j << 2 >> 2] | 0;
                t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | ~y1 & y3) | 0) + ((t1 + y4 | 0) + 1518500249 | 0) | 0);
                y4 = y3;
                y3 = y2;
                y2 = ((y1) << 30 | (y1) >>> 2);
                y1 = y0;
                y0 = t0;
                H[k + j << 2 >> 2] = t1;
            }
            for (j = k + 16 | 0; (j | 0) < (k + 20 | 0); j = j + 1 | 0) {
                t1 = (((H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) << 1 | (H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) >>> 31));
                t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | ~y1 & y3) | 0) + ((t1 + y4 | 0) + 1518500249 | 0) | 0);
                y4 = y3;
                y3 = y2;
                y2 = ((y1) << 30 | (y1) >>> 2);
                y1 = y0;
                y0 = t0;
                H[j << 2 >> 2] = t1;
            }
            for (j = k + 20 | 0; (j | 0) < (k + 40 | 0); j = j + 1 | 0) {
                t1 = (((H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) << 1 | (H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) >>> 31));
                t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 ^ y2 ^ y3) | 0) + ((t1 + y4 | 0) + 1859775393 | 0) | 0);
                y4 = y3;
                y3 = y2;
                y2 = ((y1) << 30 | (y1) >>> 2);
                y1 = y0;
                y0 = t0;
                H[j << 2 >> 2] = t1;
            }
            for (j = k + 40 | 0; (j | 0) < (k + 60 | 0); j = j + 1 | 0) {
                t1 = (((H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) << 1 | (H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) >>> 31));
                t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) | 0) + ((t1 + y4 | 0) - 1894007588 | 0) | 0);
                y4 = y3;
                y3 = y2;
                y2 = ((y1) << 30 | (y1) >>> 2);
                y1 = y0;
                y0 = t0;
                H[j << 2 >> 2] = t1;
            }
            for (j = k + 60 | 0; (j | 0) < (k + 80 | 0); j = j + 1 | 0) {
                t1 = (((H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) << 1 | (H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) >>> 31));
                t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 ^ y2 ^ y3) | 0) + ((t1 + y4 | 0) - 899497514 | 0) | 0);
                y4 = y3;
                y3 = y2;
                y2 = ((y1) << 30 | (y1) >>> 2);
                y1 = y0;
                y0 = t0;
                H[j << 2 >> 2] = t1;
            }
            y0 = y0 + z0 | 0;
            y1 = y1 + z1 | 0;
            y2 = y2 + z2 | 0;
            y3 = y3 + z3 | 0;
            y4 = y4 + z4 | 0;
        }
        H[0] = y0;
        H[1] = y1;
        H[2] = y2;
        H[3] = y3;
        H[4] = y4;
    }
    return { hash: hash };
};
;
var SHA1 = (function () {
    function SHA1() {
        this.initHeap(32);
    }
    SHA1.prototype.blockSize = function () {
        return 64;
    };
    SHA1.prototype.digestLen = function () {
        return 20;
    };
    SHA1.prototype.initHeap = function (msgSize) {
        var WORK_SPACE_LEN = 320;
        var heapSize = padLength(msgSize) + WORK_SPACE_LEN;
        if (!this.heap32 || heapSize > this.heap32.byteLength) {
            this.heap32 = new Int32Array(heapSize >> 2);
            this.dataView = new DataView(this.heap32.buffer);
            var stdlib = { Int32Array: Int32Array };
            this.core = sha1core(stdlib, null, this.heap32.buffer);
        }
    };
    SHA1.copyMsgToBe32 = function (dest, src, srcLen) {
        var words = (srcLen - 1) / 4 + 1;
        for (var word = 0; word < words - 1; word++) {
            dest[word] = src[word * 4] << 24 | src[word * 4 + 1] << 16 | src[word * 4 + 2] << 8 | src[word * 4 + 3];
        }
        var shift = ((srcLen % 4) - 1) * 8;
        for (var i = srcLen - (srcLen % 4); i < srcLen; i++) {
            dest[words - 1] |= src[i] << shift;
            shift -= 8;
        }
    };
    SHA1.prototype.hash = function (src, digest) {
        var srcLen = src.byteLength;
        this.initHeap(srcLen);
        var paddedLength = padLength(srcLen);
        for (var i = 0; i < paddedLength >> 2; i++) {
            this.heap32[i] = 0;
        }
        SHA1.copyMsgToBe32(this.heap32, src, srcLen);
        this.heap32[srcLen >> 2] |= 0x80 << (24 - (srcLen % 4 << 3));
        var msgLenPos = (((srcLen >> 2) + 2) & ~0x0f) + 15;
        this.heap32[msgLenPos] = srcLen << 3;
        var workSpace = paddedLength >> 2;
        this.heap32[workSpace] = 1732584193;
        this.heap32[workSpace + 1] = -271733879;
        this.heap32[workSpace + 2] = -1732584194;
        this.heap32[workSpace + 3] = 271733878;
        this.heap32[workSpace + 4] = -1009589776;
        var msgWords = paddedLength >> 2;
        this.core.hash(msgWords);
        for (var i = 0; i < 5; i++) {
            digest[i] = this.dataView.getInt32(i << 2, false);
        }
    };
    return SHA1;
})();
exports.SHA1 = SHA1;
var HMAC = (function () {
    function HMAC(hash, key) {
        this.hash = hash;
        this.blockSize = this.hash.blockSize();
        this.digest = new Int32Array(this.hash.digestLen() / 4);
        this.digest8 = new Uint8Array(this.digest.buffer);
        this.innerKeyPad = new Uint8Array(this.blockSize);
        this.outerKey = new Uint8Array(this.blockSize + this.digest.byteLength);
        if (key.length > this.blockSize) {
            var shortKey = new Uint8Array(this.blockSize);
            this.hash.hash(key, this.digest);
            for (var i = 0; i < shortKey.length; i++) {
                shortKey[i] = this.digest8[i];
            }
            key = shortKey;
        }
        if (key.length < this.blockSize) {
            var paddedKey = new Uint8Array(this.blockSize);
            for (var i = 0; i < key.length; i++) {
                paddedKey[i] = key[i];
            }
            key = paddedKey;
        }
        for (var i = key.length; i < this.blockSize; i++) {
            key[i] = 0;
        }
        for (var i = 0; i < this.innerKeyPad.length; i++) {
            this.innerKeyPad[i] = 0x36 ^ key[i];
        }
        for (var i = 0; i < this.outerKey.length; i++) {
            this.outerKey[i] = 0x5c ^ key[i];
        }
    }
    HMAC.prototype.digestLen = function () {
        return this.hash.digestLen();
    };
    HMAC.prototype.mac = function (message, hmac) {
        var workSpaceLen = this.blockSize + message.length;
        if (!this.workSpace || this.workSpace.byteLength != workSpaceLen) {
            this.workSpace = new Uint8Array(workSpaceLen);
        }
        for (var i = 0; i < this.blockSize; i++) {
            this.workSpace[i] = this.innerKeyPad[i];
        }
        for (var i = 0; i < message.length; i++) {
            this.workSpace[this.blockSize + i] = message[i];
        }
        this.hash.hash(this.workSpace, this.digest);
        for (var i = 0; i < this.digest.byteLength; i++) {
            this.outerKey[this.blockSize + i] = this.digest8[i];
        }
        this.hash.hash(this.outerKey, hmac);
    };
    return HMAC;
})();
exports.HMAC = HMAC;
var PBKDF2 = (function () {
    function PBKDF2(macFn) {
        this.createMAC = macFn;
        if (!this.createMAC) {
            this.createMAC = function (password) {
                return new HMAC(new SHA1(), password);
            };
        }
    }
    PBKDF2.prototype.keyBlock = function (password, salt, iterations, blockIndex) {
        var hmac = this.createMAC(password);
        var paddedSalt = new Uint8Array(salt.length + 4);
        var paddedSaltView = new DataView(paddedSalt.buffer);
        collectionutil.copyBuffer(paddedSalt, salt);
        paddedSaltView.setInt32(salt.length, blockIndex + 1, false);
        var chunk = new Int32Array(hmac.digestLen() / 4);
        var chunk8 = new Uint8Array(chunk.buffer);
        hmac.mac(paddedSalt, chunk);
        var currentBlock = new Int32Array(chunk.length);
        collectionutil.copyBuffer(currentBlock, chunk);
        for (var i = 1; i < iterations; i++) {
            hmac.mac(chunk8, chunk);
            for (var k = 0; k < chunk.length; k++) {
                currentBlock[k] = currentBlock[k] ^ chunk[k];
            }
        }
        return currentBlock.buffer;
    };
    PBKDF2.prototype.key = function (password, salt, iterations, derivedKeyLen) {
        var result = new Uint8Array(derivedKeyLen);
        var resultLen = 0;
        var hmac = this.createMAC(password);
        var blocks = roundUp(derivedKeyLen, hmac.digestLen()) / hmac.digestLen();
        for (var blockIndex = 0; blockIndex < blocks; blockIndex++) {
            var block = this.keyBlock(password, salt, iterations, blockIndex);
            var currentBlock8 = new Uint8Array(block);
            for (var i = 0; i < hmac.digestLen() && resultLen < derivedKeyLen; i++) {
                result[resultLen] = currentBlock8[i];
                ++resultLen;
            }
        }
        return result;
    };
    return PBKDF2;
})();
exports.PBKDF2 = PBKDF2;
//# sourceMappingURL=pbkdf2.js.map
},{"../base/collectionutil":1}],4:[function(require,module,exports){
var collectionutil = require('./base/collectionutil');
var env = require('./base/env');
var pbkdf2Lib = require('./crypto/pbkdf2');
exports.SCRIPT_PATH = env.isNodeJS() ? './build/lib/crypto_worker.js' : 'scripts/crypto_worker.js';
function startWorker(worker) {
    var pbkdf2 = new pbkdf2Lib.PBKDF2();
    worker.onmessage = function (e) {
        var req = e.data;
        var passBuf = collectionutil.bufferFromString(req.pass);
        var saltBuf = collectionutil.bufferFromString(req.salt);
        var derivedKeyBlock = pbkdf2.keyBlock(passBuf, saltBuf, req.iterations, req.blockIndex);
        var response = {
            requestId: req.id,
            keyBlock: collectionutil.stringFromBuffer(new Uint8Array(derivedKeyBlock))
        };
        worker.postMessage(response);
    };
}
exports.startWorker = startWorker;
var workerClient;
if (env.isNodeJS()) {
    var nodeworker = require('./node_worker');
    workerClient = new nodeworker.WorkerClient();
}
else if (env.isWebWorker()) {
    workerClient = self;
}
if (workerClient) {
    startWorker(workerClient);
}
//# sourceMappingURL=crypto_worker.js.map
},{"./base/collectionutil":1,"./base/env":2,"./crypto/pbkdf2":3,"./node_worker":5}],5:[function(require,module,exports){
(function (process){
var child_process = require('child_process');
var Worker = (function () {
    function Worker(scriptUrl) {
        var _this = this;
        this.process = child_process.fork(scriptUrl);
        this.process.on('message', function (msg) {
            if (_this.onmessage) {
                _this.onmessage({ data: msg });
            }
        });
        this.process.on('error', function (err) {
            if (_this.onerror) {
                _this.onerror(err);
            }
        });
        process.on('exit', function () {
            _this.terminate();
        });
    }
    Worker.prototype.postMessage = function (obj) {
        this.process.send(obj, undefined);
    };
    Worker.prototype.terminate = function () {
        this.process.kill();
    };
    return Worker;
})();
exports.Worker = Worker;
var WorkerClient = (function () {
    function WorkerClient() {
        var _this = this;
        process.on('message', function (message) {
            if (_this.onmessage) {
                _this.onmessage({ data: message });
            }
        });
    }
    WorkerClient.prototype.close = function () {
        process.exit(0);
    };
    WorkerClient.prototype.postMessage = function (message, ports) {
        process.send(message);
    };
    return WorkerClient;
})();
exports.WorkerClient = WorkerClient;
//# sourceMappingURL=node_worker.js.map
}).call(this,require("/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":7,"child_process":6}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.once = noop;
process.off = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[4])