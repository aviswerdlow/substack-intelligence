/**
 * Manual test script for settings encryption
 * Run this to verify encryption/decryption works correctly
 */

import { encryptSettings, decryptSettings, validatePassword } from './settings-encryption';

// Mock settings for testing
const testSettings = {
  account: { name: 'Test User', email: 'test@example.com' },
  ai: { apiKey: 'sk-test-key-123', provider: 'openai' },
  api: { 
    keys: [{ id: '1', name: 'test', key: 'secret-key' }],
    webhooks: [{ id: '1', url: 'https://example.com/webhook', events: [], enabled: true }]
  }
};

const testPassword = 'TestPassword123!@#';

async function runTest() {
  console.log('🔐 Testing Settings Encryption...\n');

  try {
    // Test password validation
    console.log('1. Testing password validation...');
    const validation = validatePassword(testPassword);
    console.log(`   Password valid: ${validation.valid}`);
    if (!validation.valid) {
      console.log(`   Errors: ${validation.errors.join(', ')}`);
      return;
    }
    console.log('   ✅ Password validation passed\n');

    // Test encryption
    console.log('2. Testing encryption...');
    const encrypted = await encryptSettings(testSettings, { password: testPassword });
    console.log(`   Encrypted data length: ${encrypted.encryptedData.length}`);
    console.log(`   Salt length: ${encrypted.salt.length}`);
    console.log(`   IV length: ${encrypted.iv.length}`);
    console.log(`   Tag length: ${encrypted.tag.length}`);
    console.log('   ✅ Encryption completed\n');

    // Test decryption
    console.log('3. Testing decryption...');
    const decrypted = await decryptSettings(encrypted, { password: testPassword });
    console.log('   ✅ Decryption completed\n');

    // Verify data integrity
    console.log('4. Verifying data integrity...');
    const matches = JSON.stringify(testSettings) === JSON.stringify(decrypted);
    console.log(`   Data matches: ${matches}`);
    
    if (matches) {
      console.log('   ✅ All tests passed!\n');
      console.log('🎉 Settings encryption is working correctly!');
    } else {
      console.log('   ❌ Data integrity check failed');
      console.log('Original:', JSON.stringify(testSettings, null, 2));
      console.log('Decrypted:', JSON.stringify(decrypted, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Only run if this file is executed directly (not imported)
if (typeof require !== 'undefined' && require.main === module) {
  // Setup crypto polyfill for Node.js if needed
  if (typeof crypto === 'undefined') {
    const { webcrypto } = require('crypto');
    (global as any).crypto = webcrypto;
  }
  
  runTest();
}

export { runTest };