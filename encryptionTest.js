const { encrypt, decrypt } = require('./database');

// Test data
const testData = 'Test message';
// Ensure this is a 16-byte hexadecimal string (32 hex characters)
const testIv = '0123456789abcdef0123456789abcdef';

// Test encryption
const encryptedData = encrypt(testData, testIv);
console.log('Encrypted data:', encryptedData);

// Test decryption
const decryptedData = decrypt(encryptedData);
console.log('Decrypted data:', decryptedData);

// Verify that the decrypted text matches the original
console.log('Is decryption correct?', testData === decryptedData);

