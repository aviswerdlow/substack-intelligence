// Quick type check for our encryption implementation
import { encryptData, decryptData, createEncryptedExport, parseEncryptedImport } from './lib/encryption';

// Test type safety
const testData = { test: 'data' };
const password = 'password123';

// These should all compile without errors
const encrypted = createEncryptedExport(testData, password);
const decrypted = parseEncryptedImport(encrypted, password);

console.log('✅ Type checking passed - encryption module is correctly typed');

export {};