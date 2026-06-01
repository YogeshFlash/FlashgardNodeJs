import * as crypto from 'crypto';

const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32';
const LICENSE_IV = Buffer.alloc(16, 0); // 16 bytes of zeros for deterministic encryption
const PREFIX = 'enc:';

export function encryptLicenseKey(key: string): string {
  if (!key) return key;
  // If it's already encrypted, return as is
  if (key.startsWith(PREFIX)) return key;

  const cipher = crypto.createCipheriv('aes-256-ctr', Buffer.from(ENCRYPTION_KEY), LICENSE_IV);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(key, 'utf8')), cipher.final()]);
  return PREFIX + encrypted.toString('base64');
}

export function decryptLicenseKey(val: string): string {
  if (!val) return val;
  if (!val.startsWith(PREFIX)) {
    return val; // Return as-is if it is plaintext
  }

  try {
    const encryptedBase64 = val.substring(PREFIX.length);
    const decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(ENCRYPTION_KEY), LICENSE_IV);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedBase64, 'base64')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    // Fallback: return original string if decryption fails
    return val;
  }
}
