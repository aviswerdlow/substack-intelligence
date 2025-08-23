import { describe, it, expect } from '@jest/globals';
import {
  encryptData,
  decryptData,
  createEncryptedExport,
  parseEncryptedImport,
  isEncryptedFile
} from './encryption';

describe('Encryption Module', () => {
  const testData = 'This is sensitive test data!';
  const testPassword = 'TestPassword123!@#';
  const complexData = {
    account: {
      email: 'test@example.com',
      apiKey: 'sk-1234567890abcdef',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    },
    settings: {
      ai: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4096
      }
    },
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\',
    unicode: '你好世界 🌍 Привет мир',
    numbers: [1, 2, 3, 4, 5],
    nested: {
      deep: {
        deeper: {
          value: 'deeply nested value'
        }
      }
    }
  };

  describe('encryptData', () => {
    it('should encrypt data successfully with valid password', () => {
      const result = encryptData(testData, testPassword);
      
      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('iterations');
      expect(result.iterations).toBe(100000);
      expect(result.encrypted).not.toBe(testData);
      expect(result.encrypted).not.toContain(testData);
    });

    it('should generate different encrypted results for same data', () => {
      const result1 = encryptData(testData, testPassword);
      const result2 = encryptData(testData, testPassword);
      
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should throw error when password is empty', () => {
      expect(() => encryptData(testData, '')).toThrow('Password is required for encryption');
    });

    it('should handle large data sets', () => {
      const largeData = 'x'.repeat(1000000); // 1MB of data
      const result = encryptData(largeData, testPassword);
      
      expect(result).toHaveProperty('encrypted');
      expect(result.encrypted).not.toBe(largeData);
    });

    it('should handle special characters in data', () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      const result = encryptData(specialData, testPassword);
      
      expect(result).toHaveProperty('encrypted');
      expect(result.encrypted).not.toBe(specialData);
    });

    it('should handle unicode characters', () => {
      const unicodeData = '你好世界 🌍 Привет мир こんにちは';
      const result = encryptData(unicodeData, testPassword);
      
      expect(result).toHaveProperty('encrypted');
      expect(result.encrypted).not.toBe(unicodeData);
    });
  });

  describe('decryptData', () => {
    it('should decrypt data successfully with correct password', () => {
      const encrypted = encryptData(testData, testPassword);
      const decrypted = decryptData({
        ...encrypted,
        password: testPassword
      });
      
      expect(decrypted).toBe(testData);
    });

    it('should fail with incorrect password', () => {
      const encrypted = encryptData(testData, testPassword);
      
      expect(() => decryptData({
        ...encrypted,
        password: 'WrongPassword'
      })).toThrow('Decryption failed');
    });

    it('should throw error when password is empty', () => {
      const encrypted = encryptData(testData, testPassword);
      
      expect(() => decryptData({
        ...encrypted,
        password: ''
      })).toThrow('Password is required for decryption');
    });

    it('should handle corrupted data', () => {
      expect(() => decryptData({
        encrypted: 'corrupted-data',
        salt: 'invalid-salt',
        iv: 'invalid-iv',
        iterations: 100000,
        password: testPassword
      })).toThrow('Decryption failed');
    });

    it('should decrypt large data sets', () => {
      const largeData = 'x'.repeat(1000000);
      const encrypted = encryptData(largeData, testPassword);
      const decrypted = decryptData({
        ...encrypted,
        password: testPassword
      });
      
      expect(decrypted).toBe(largeData);
    });

    it('should decrypt special characters correctly', () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      const encrypted = encryptData(specialData, testPassword);
      const decrypted = decryptData({
        ...encrypted,
        password: testPassword
      });
      
      expect(decrypted).toBe(specialData);
    });

    it('should decrypt unicode characters correctly', () => {
      const unicodeData = '你好世界 🌍 Привет мир こんにちは';
      const encrypted = encryptData(unicodeData, testPassword);
      const decrypted = decryptData({
        ...encrypted,
        password: testPassword
      });
      
      expect(decrypted).toBe(unicodeData);
    });
  });

  describe('createEncryptedExport', () => {
    it('should create encrypted export with metadata', () => {
      const exportStr = createEncryptedExport(complexData, testPassword);
      const exportData = JSON.parse(exportStr);
      
      expect(exportData).toHaveProperty('version', '1.0');
      expect(exportData).toHaveProperty('encrypted', true);
      expect(exportData).toHaveProperty('algorithm', 'AES-256-CBC');
      expect(exportData).toHaveProperty('kdf', 'PBKDF2');
      expect(exportData).toHaveProperty('salt');
      expect(exportData).toHaveProperty('iv');
      expect(exportData).toHaveProperty('iterations');
    });

    it('should preserve complex data structures', () => {
      const exportStr = createEncryptedExport(complexData, testPassword);
      const decrypted = parseEncryptedImport(exportStr, testPassword);
      
      expect(decrypted).toEqual(complexData);
    });

    it('should handle null and undefined values', () => {
      const dataWithNull = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        false: false
      };
      
      const exportStr = createEncryptedExport(dataWithNull, testPassword);
      const decrypted = parseEncryptedImport(exportStr, testPassword);
      
      expect(decrypted.nullValue).toBeNull();
      expect(decrypted.undefinedValue).toBeUndefined();
      expect(decrypted.emptyString).toBe('');
      expect(decrypted.zero).toBe(0);
      expect(decrypted.false).toBe(false);
    });
  });

  describe('parseEncryptedImport', () => {
    it('should parse and decrypt encrypted files', () => {
      const exportStr = createEncryptedExport(complexData, testPassword);
      const imported = parseEncryptedImport(exportStr, testPassword);
      
      expect(imported).toEqual(complexData);
    });

    it('should handle non-encrypted JSON files', () => {
      const plainJson = JSON.stringify(complexData);
      const imported = parseEncryptedImport(plainJson, '');
      
      expect(imported).toEqual(complexData);
    });

    it('should fail with wrong password', () => {
      const exportStr = createEncryptedExport(complexData, testPassword);
      
      expect(() => parseEncryptedImport(exportStr, 'WrongPassword'))
        .toThrow('Decryption failed');
    });

    it('should reject unsupported encryption algorithms', () => {
      const unsupportedExport = JSON.stringify({
        version: '1.0',
        encrypted: true,
        algorithm: 'ROT13',
        kdf: 'MD5',
        encrypted: 'some-data'
      });
      
      expect(() => parseEncryptedImport(unsupportedExport, testPassword))
        .toThrow('Unsupported encryption algorithm');
    });

    it('should handle malformed JSON', () => {
      expect(() => parseEncryptedImport('not-json', testPassword))
        .toThrow('Failed to parse import file');
    });
  });

  describe('isEncryptedFile', () => {
    it('should identify encrypted files', () => {
      const exportStr = createEncryptedExport(complexData, testPassword);
      expect(isEncryptedFile(exportStr)).toBe(true);
    });

    it('should identify non-encrypted files', () => {
      const plainJson = JSON.stringify(complexData);
      expect(isEncryptedFile(plainJson)).toBe(false);
    });

    it('should handle invalid JSON', () => {
      expect(isEncryptedFile('not-json')).toBe(false);
    });

    it('should handle files with partial encryption metadata', () => {
      const partialData = JSON.stringify({
        encrypted: true,
        algorithm: 'WRONG'
      });
      expect(isEncryptedFile(partialData)).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should not leak password in encrypted output', () => {
      const password = 'SuperSecretPassword123!';
      const result = encryptData(testData, password);
      const exportStr = createEncryptedExport(complexData, password);
      
      expect(result.encrypted).not.toContain(password);
      expect(result.salt).not.toContain(password);
      expect(result.iv).not.toContain(password);
      expect(exportStr).not.toContain(password);
    });

    it('should not leak original data in encrypted output', () => {
      const sensitiveData = {
        apiKey: 'sk-super-secret-api-key',
        password: 'user-password-123',
        ssn: '123-45-6789'
      };
      
      const exportStr = createEncryptedExport(sensitiveData, testPassword);
      
      expect(exportStr).not.toContain('sk-super-secret-api-key');
      expect(exportStr).not.toContain('user-password-123');
      expect(exportStr).not.toContain('123-45-6789');
    });

    it('should use sufficient iteration count for PBKDF2', () => {
      const result = encryptData(testData, testPassword);
      expect(result.iterations).toBeGreaterThanOrEqual(100000);
    });

    it('should generate cryptographically random salt and IV', () => {
      const results = Array.from({ length: 100 }, () => 
        encryptData(testData, testPassword)
      );
      
      const salts = new Set(results.map(r => r.salt));
      const ivs = new Set(results.map(r => r.iv));
      
      expect(salts.size).toBe(100);
      expect(ivs.size).toBe(100);
    });
  });

  describe('Performance Tests', () => {
    it('should encrypt/decrypt within reasonable time for typical settings', () => {
      const typicalSettings = {
        account: { email: 'test@example.com' },
        preferences: { theme: 'dark' },
        api: { keys: Array(10).fill({ name: 'key', value: 'value' }) }
      };
      
      const startEncrypt = Date.now();
      const encrypted = createEncryptedExport(typicalSettings, testPassword);
      const encryptTime = Date.now() - startEncrypt;
      
      const startDecrypt = Date.now();
      parseEncryptedImport(encrypted, testPassword);
      const decryptTime = Date.now() - startDecrypt;
      
      expect(encryptTime).toBeLessThan(5000); // 5 seconds max
      expect(decryptTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});