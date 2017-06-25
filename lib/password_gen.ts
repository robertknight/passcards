import crypto = require('./base/crypto');

var DEFAULT_PASSWORD_CHARSETS = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
];

/** Generate a new random password. */
export function generatePassword(length: number, charsets?: string[]): string {
    charsets = charsets || DEFAULT_PASSWORD_CHARSETS;
    var fullCharset = charsets.join('');

    var genCandidate = (length: number) => {
        var candidate = '';
        var sectionSize = 3;
        while (candidate.length < length) {
            var buffer = crypto.randomBytes(100);
            for (
                var i = 0;
                candidate.length < length && i < buffer.length;
                i++
            ) {
                if (
                    candidate.length % (sectionSize + 1) == sectionSize &&
                    length - candidate.length > 1
                ) {
                    candidate += '-';
                }
                if (buffer.charCodeAt(i) < fullCharset.length) {
                    candidate += fullCharset[buffer.charCodeAt(i)];
                }
            }
        }
        return candidate;
    };
    while (true) {
        // generate a candiate, check that it contains at least one
        // character from each of the charsets
        var candidate = genCandidate(length);
        var charsetMatches = new Array(charsets.length);

        for (var i = 0; i < candidate.length; i++) {
            for (var k = 0; k < charsetMatches.length; k++) {
                charsetMatches[k] =
                    charsetMatches[k] ||
                    charsets[k].indexOf(candidate[i]) != -1;
            }
        }
        if (
            charsetMatches.every((match: boolean) => {
                return match;
            })
        ) {
            return candidate;
        }
    }
}
