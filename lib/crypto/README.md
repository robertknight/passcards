A fast SHA-1 implementation for Javascript built on
Rusha's SHA-1 core (see https://github.com/srijs/rusha)

Whereas Rusha is optimized for hashing large binary blobs,
this implementation is optimized for use in a PBKDF implementation
where the hash function is called a large number (tens of thousands)
of times with only small messages, so minimizing the per-call
overhead is important.

This implementation also needs to work well on current-gen mobile
devices.

