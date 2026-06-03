const { encryptLicenseKey, decryptLicenseKey } = require('../dist/utils/encryption');

function main() {
  console.log('--- Testing License Encryption/Decryption ---');
  
  // Test case 1: Encrypt and decrypt a normal key
  const plainKey = 'LB-12345-67890-ABCDE-12345';
  const encryptedKey = encryptLicenseKey(plainKey);
  const decryptedKey = decryptLicenseKey(encryptedKey);

  console.log('Plaintext key: ', plainKey);
  console.log('Encrypted key: ', encryptedKey);
  console.log('Decrypted key: ', decryptedKey);

  if (plainKey === decryptedKey) {
    console.log('SUCCESS: Plaintext matches decrypted key!');
  } else {
    console.error('FAIL: Key mismatch!');
  }

  // Test case 2: Fallback for existing plaintext keys in database
  const plaintextKey = 'LB-PLAIN-KEY-NO-ENCRYPT';
  const decryptedPlaintext = decryptLicenseKey(plaintextKey);
  console.log('\nExisting database plaintext key:', plaintextKey);
  console.log('Decrypted output:', decryptedPlaintext);
  if (plaintextKey === decryptedPlaintext) {
    console.log('SUCCESS: Plaintext fallback matches original key!');
  } else {
    console.error('FAIL: Plaintext fallback failed!');
  }
}

main();
