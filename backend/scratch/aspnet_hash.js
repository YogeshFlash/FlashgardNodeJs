const crypto = require('crypto');

function verifyAspNetIdentityV3Hash(hashedPassword, password) {
    try {
        const decoded = Buffer.from(hashedPassword, 'base64');
        
        // ASP.NET Core Identity V3 format:
        // byte 0: version (0x01)
        // bytes 1-4: PRF (Key derivation pseudo-random function) -> 1 is HMACSHA256
        // bytes 5-8: iter count (network byte order)
        // bytes 9-12: salt size
        // bytes 13..(13+salt size): salt
        // bytes remaining: subkey
        
        if (decoded.length === 0 || decoded[0] !== 0x01) {
            return false;
        }

        const prf = decoded.readUInt32BE(1);
        const iterCount = decoded.readUInt32BE(5);
        const saltLength = decoded.readUInt32BE(9);
        
        let hashAlgorithm = '';
        if (prf === 0) hashAlgorithm = 'sha1';
        else if (prf === 1) hashAlgorithm = 'sha256';
        else if (prf === 2) hashAlgorithm = 'sha512';
        else return false;

        const salt = decoded.slice(13, 13 + saltLength);
        const expectedSubkey = decoded.slice(13 + saltLength);

        const actualSubkey = crypto.pbkdf2Sync(
            password,
            salt,
            iterCount,
            expectedSubkey.length,
            hashAlgorithm
        );

        return crypto.timingSafeEqual(expectedSubkey, actualSubkey);
    } catch (err) {
        return false;
    }
}

// Example usage:
// A dummy ASP.NET Core V3 hash of 'password123' or similar. 
// We will just export this.
module.exports = { verifyAspNetIdentityV3Hash };
