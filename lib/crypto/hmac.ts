import sha1 = require('./sha1');

export interface MAC {
    digestLen(): number;
    mac(message: Uint8Array, result: Int32Array): void;
}

export class HMAC implements MAC {
    private hash: sha1.Hash;
    private blockSize: number;
    private workSpace: Uint8Array;
    private digest: Int32Array;
    private digest8: Uint8Array;

    private innerKeyPad: Uint8Array;
    private outerKey: Uint8Array;

    constructor(hash: sha1.Hash, key: Uint8Array) {
        this.hash = hash;
        this.blockSize = this.hash.blockSize();
        this.digest = new Int32Array(this.hash.digestLen() / 4);
        this.digest8 = new Uint8Array(this.digest.buffer);

        this.innerKeyPad = new Uint8Array(this.blockSize);
        this.outerKey = new Uint8Array(this.blockSize + this.digest.byteLength);

        var i = 0;

        // shorten key if longer than block length
        if (key.length > this.blockSize) {
            var shortKey = new Uint8Array(this.blockSize);
            this.hash.hash(key, this.digest);
            for (i = 0; i < shortKey.length; i++) {
                shortKey[i] = this.digest8[i];
            }
            key = shortKey;
        }

        // pad key to block length
        if (key.length < this.blockSize) {
            var paddedKey = new Uint8Array(this.blockSize);
            for (i = 0; i < key.length; i++) {
                paddedKey[i] = key[i];
            }
            key = paddedKey;
        }

        for (i = key.length; i < this.blockSize; i++) {
            key[i] = 0;
        }

        // setup inner key padding
        for (i = 0; i < this.innerKeyPad.length; i++) {
            this.innerKeyPad[i] = 0x36 ^ key[i];
        }
        for (i = 0; i < this.outerKey.length; i++) {
            this.outerKey[i] = 0x5c ^ key[i];
        }
    }

    digestLen(): number {
        return this.hash.digestLen();
    }

    /** Computes the HMAC of @p message using the password
	  * supplied in the constructor. The resulting digest
	  * is stored in @p hmac.
	  */
    mac(message: Uint8Array, hmac: Int32Array) {
        // inner key padding
        var workSpaceLen = this.blockSize + message.length;
        if (!this.workSpace || this.workSpace.byteLength != workSpaceLen) {
            this.workSpace = new Uint8Array(workSpaceLen);
        }

        var i = 0;
        for (i = 0; i < this.blockSize; i++) {
            this.workSpace[i] = this.innerKeyPad[i];
        }
        for (i = 0; i < message.length; i++) {
            this.workSpace[this.blockSize + i] = message[i];
        }
        this.hash.hash(this.workSpace, this.digest);

        // outer key padding
        for (i = 0; i < this.digest.byteLength; i++) {
            this.outerKey[this.blockSize + i] = this.digest8[i];
        }
        this.hash.hash(this.outerKey, hmac);
    }
}
