// Simple test script to verify encryption functionality
const crypto = require('crypto-js');

// Test basic encryption/decryption
function testEncryption() {
  console.log('Testing AES-256 Encryption Implementation...\n');
  
  const testCases = [
    {
      name: 'Simple text',
      data: 'Hello, World!',
      password: 'TestPassword123'
    },
    {
      name: 'Special characters',
      data: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\',
      password: 'P@ssw0rd!#$'
    },
    {
      name: 'Unicode characters',
      data: '你好世界 🌍 Привет мир こんにちは',
      password: 'UnicodePass123'
    },
    {
      name: 'Large data (1KB)',
      data: 'x'.repeat(1024),
      password: 'LargeDataPass'
    },
    {
      name: 'Complex JSON structure',
      data: JSON.stringify({
        account: { email: 'test@example.com', apiKey: 'sk-1234567890' },
        settings: { ai: { model: 'gpt-4', temperature: 0.7 } },
        arrays: [1, 2, 3, 4, 5],
        nested: { deep: { deeper: { value: 'nested' } } }
      }),
      password: 'ComplexPass123'
    }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    
    try {
      // Encrypt
      const salt = crypto.lib.WordArray.random(128 / 8);
      const key = crypto.PBKDF2(testCase.password, salt, {
        keySize: 256 / 32,
        iterations: 100000,
        hasher: crypto.algo.SHA256
      });
      const iv = crypto.lib.WordArray.random(128 / 8);
      
      const encrypted = crypto.AES.encrypt(testCase.data, key, {
        iv: iv,
        mode: crypto.mode.CBC,
        padding: crypto.pad.Pkcs7
      });
      
      // Decrypt
      const decrypted = crypto.AES.decrypt(encrypted, key, {
        iv: iv,
        mode: crypto.mode.CBC,
        padding: crypto.pad.Pkcs7
      });
      
      const decryptedStr = decrypted.toString(crypto.enc.Utf8);
      
      if (decryptedStr === testCase.data) {
        console.log('  ✅ Passed: Encryption/decryption successful');
        passedTests++;
      } else {
        console.log('  ❌ Failed: Decrypted data does not match original');
        console.log(`     Expected: ${testCase.data.substring(0, 50)}...`);
        console.log(`     Got: ${decryptedStr.substring(0, 50)}...`);
        failedTests++;
      }
      
      // Test wrong password
      const wrongKey = crypto.PBKDF2('WrongPassword', salt, {
        keySize: 256 / 32,
        iterations: 100000,
        hasher: crypto.algo.SHA256
      });
      
      try {
        const wrongDecrypt = crypto.AES.decrypt(encrypted, wrongKey, {
          iv: iv,
          mode: crypto.mode.CBC,
          padding: crypto.pad.Pkcs7
        });
        const wrongStr = wrongDecrypt.toString(crypto.enc.Utf8);
        
        if (wrongStr === testCase.data) {
          console.log('  ❌ Security Failed: Wrong password decrypted data!');
          failedTests++;
        } else {
          console.log('  ✅ Security Passed: Wrong password rejected');
        }
      } catch (e) {
        console.log('  ✅ Security Passed: Wrong password threw error');
      }
      
    } catch (error) {
      console.log(`  ❌ Failed with error: ${error.message}`);
      failedTests++;
    }
    
    console.log('');
  });
  
  // Test performance
  console.log('Performance Test:');
  const perfData = JSON.stringify({ test: 'data'.repeat(1000) });
  const perfPassword = 'PerfTestPass';
  
  const startTime = Date.now();
  const salt = crypto.lib.WordArray.random(128 / 8);
  const key = crypto.PBKDF2(perfPassword, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: crypto.algo.SHA256
  });
  const iv = crypto.lib.WordArray.random(128 / 8);
  
  const encrypted = crypto.AES.encrypt(perfData, key, {
    iv: iv,
    mode: crypto.mode.CBC,
    padding: crypto.pad.Pkcs7
  });
  
  const decrypted = crypto.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: crypto.mode.CBC,
    padding: crypto.pad.Pkcs7
  });
  
  const endTime = Date.now();
  console.log(`  Encryption + Decryption time: ${endTime - startTime}ms`);
  
  if (endTime - startTime < 5000) {
    console.log('  ✅ Performance acceptable (< 5 seconds)');
    passedTests++;
  } else {
    console.log('  ❌ Performance too slow (> 5 seconds)');
    failedTests++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  console.log('='.repeat(50));
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! The encryption implementation is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
}

// Run the tests
testEncryption();