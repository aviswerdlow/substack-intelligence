/**
 * Tests for Settings Encryption Module
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  encryptSettings,
  decryptSettings,
  validatePassword,
  createEncryptionMetadata,
  SettingsEncryptionError
} from '../settings-encryption';

// Mock settings data for testing
const mockSettings = {
  account: {
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    timezone: 'UTC'
  },
  ai: {
    provider: 'anthropic',
    model: 'claude-3',
    apiKey: 'sk-ant-test-key-12345',
    anthropicApiKey: 'sk-ant-test-key-12345',
    openaiApiKey: 'sk-openai-test-key-67890',
    temperature: 0.7,
    maxTokens: 1000,
    enableEnrichment: true
  },
  api: {
    keys: [{
      id: '1',
      name: 'Test API Key',
      key: 'test-api-key-123',
      createdAt: '2024-01-01T00:00:00Z',
      lastUsed: null
    }],
    webhooks: [{
      id: '1',
      url: 'https://example.com/webhook',
      events: ['test'],
      enabled: true
    }]
  }
};

const validPassword = 'TestPassword123!@#';
const weakPassword = '123';

// Setup crypto polyfill for Node.js testing environment
const crypto = require('crypto').webcrypto;
global.crypto = crypto;

describe('Password Validation', () => {
  test('validates strong password', () => {
    const result = validatePassword(validPassword);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects weak password', () => {
    const result = validatePassword(weakPassword);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validates password requirements', () => {
    const tests = [
      { password: 'short', expectedErrors: ['too short', 'uppercase', 'number', 'special'] },
      { password: 'nouppercase123!', expectedErrors: ['uppercase'] },
      { password: 'NOLOWERCASE123!', expectedErrors: ['lowercase'] },
      { password: 'NoNumbers!', expectedErrors: ['number'] },
      { password: 'NoSpecialChar123', expectedErrors: ['special'] }
    ];

    tests.forEach(({ password, expectedErrors }) => {
      const result = validatePassword(password);
      expect(result.valid).toBe(false);
      expectedErrors.forEach(errorType => {
        expect(result.errors.some(error => 
          error.toLowerCase().includes(errorType.toLowerCase())
        )).toBe(true);
      });
    });
  });
});

describe('Settings Encryption', () => {
  test('encrypts and decrypts settings successfully', async () => {
    const encrypted = await encryptSettings(mockSettings, { password: validPassword });
    
    // Verify encryption result structure
    expect(encrypted).toHaveProperty('encryptedData');
    expect(encrypted).toHaveProperty('salt');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('tag');
    
    // Verify all fields are base64 strings
    expect(typeof encrypted.encryptedData).toBe('string');
    expect(typeof encrypted.salt).toBe('string');
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.tag).toBe('string');
    
    // Decrypt and verify
    const decrypted = await decryptSettings(encrypted, { password: validPassword });
    expect(decrypted).toEqual(mockSettings);
  });

  test('rejects weak password during encryption', async () => {
    await expect(
      encryptSettings(mockSettings, { password: weakPassword })
    ).rejects.toThrow(SettingsEncryptionError);
  });

  test('fails with incorrect password during decryption', async () => {
    const encrypted = await encryptSettings(mockSettings, { password: validPassword });
    
    await expect(
      decryptSettings(encrypted, { password: 'WrongPassword123!' })
    ).rejects.toThrow(SettingsEncryptionError);
  });

  test('handles corrupted encrypted data', async () => {
    const encrypted = await encryptSettings(mockSettings, { password: validPassword });
    
    // Corrupt the encrypted data
    const corrupted = { ...encrypted, encryptedData: 'corrupted-data' };
    
    await expect(
      decryptSettings(corrupted, { password: validPassword })
    ).rejects.toThrow(SettingsEncryptionError);
  });

  test('produces different results for same input (randomness)', async () => {
    const encrypted1 = await encryptSettings(mockSettings, { password: validPassword });
    const encrypted2 = await encryptSettings(mockSettings, { password: validPassword });
    
    // Should have different salts and IVs
    expect(encrypted1.salt).not.toBe(encrypted2.salt);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
    
    // But both should decrypt to the same data
    const decrypted1 = await decryptSettings(encrypted1, { password: validPassword });
    const decrypted2 = await decryptSettings(encrypted2, { password: validPassword });
    expect(decrypted1).toEqual(decrypted2);
  });

  test('handles empty settings object', async () => {
    const emptySettings = {};
    const encrypted = await encryptSettings(emptySettings, { password: validPassword });
    const decrypted = await decryptSettings(encrypted, { password: validPassword });
    expect(decrypted).toEqual(emptySettings);
  });

  test('handles complex nested settings', async () => {
    const complexSettings = {
      ...mockSettings,
      nested: {
        deeply: {
          nested: {
            value: 'test',
            array: [1, 2, 3],
            object: { key: 'value' }
          }
        }
      }
    };
    
    const encrypted = await encryptSettings(complexSettings, { password: validPassword });
    const decrypted = await decryptSettings(encrypted, { password: validPassword });
    expect(decrypted).toEqual(complexSettings);
  });
});

describe('Encryption Metadata', () => {
  test('creates correct metadata structure', () => {
    const sensitiveFields = ['ai.apiKey', 'api.keys.key'];
    const metadata = createEncryptionMetadata(sensitiveFields);
    
    expect(metadata).toHaveProperty('version');
    expect(metadata).toHaveProperty('algorithm');
    expect(metadata).toHaveProperty('keyDerivation');
    expect(metadata).toHaveProperty('iterations');
    expect(metadata).toHaveProperty('encryptedAt');
    expect(metadata).toHaveProperty('sensitiveFields');
    
    expect(metadata.algorithm).toBe('AES-GCM');
    expect(metadata.keyDerivation).toBe('PBKDF2');
    expect(metadata.iterations).toBe(100000);
    expect(metadata.sensitiveFields).toEqual(sensitiveFields);
    expect(new Date(metadata.encryptedAt)).toBeInstanceOf(Date);
  });
});

describe('Error Handling', () => {
  test('throws SettingsEncryptionError for encryption failures', async () => {
    // Test with undefined password
    await expect(
      encryptSettings(mockSettings, { password: '' })
    ).rejects.toThrow(SettingsEncryptionError);
  });

  test('throws SettingsEncryptionError for decryption failures', async () => {
    const invalidEncryption = {
      encryptedData: 'invalid',
      salt: 'invalid',
      iv: 'invalid',
      tag: 'invalid'
    };
    
    await expect(
      decryptSettings(invalidEncryption, { password: validPassword })
    ).rejects.toThrow(SettingsEncryptionError);
  });

  test('includes original error as cause', async () => {
    try {
      await encryptSettings(mockSettings, { password: '' });
    } catch (error) {
      expect(error).toBeInstanceOf(SettingsEncryptionError);
      expect((error as SettingsEncryptionError).cause).toBeDefined();
    }
  });
});

describe('Security Properties', () => {
  test('salt is sufficiently random', async () => {
    const results = await Promise.all(
      Array(10).fill(0).map(() => 
        encryptSettings(mockSettings, { password: validPassword })
      )
    );
    
    const salts = results.map(r => r.salt);
    const uniqueSalts = new Set(salts);
    expect(uniqueSalts.size).toBe(salts.length); // All salts should be unique
  });

  test('IV is sufficiently random', async () => {
    const results = await Promise.all(
      Array(10).fill(0).map(() => 
        encryptSettings(mockSettings, { password: validPassword })
      )
    );
    
    const ivs = results.map(r => r.iv);
    const uniqueIvs = new Set(ivs);
    expect(uniqueIvs.size).toBe(ivs.length); // All IVs should be unique
  });

  test('encryption output is not predictable', async () => {
    const results = await Promise.all(
      Array(10).fill(0).map(() => 
        encryptSettings(mockSettings, { password: validPassword })
      )
    );
    
    const encryptedData = results.map(r => r.encryptedData);
    const uniqueEncrypted = new Set(encryptedData);
    expect(uniqueEncrypted.size).toBe(encryptedData.length); // All encrypted data should be unique
  });

  test('uses sufficient PBKDF2 iterations', () => {
    const metadata = createEncryptionMetadata([]);
    expect(metadata.iterations).toBeGreaterThanOrEqual(100000); // OWASP recommendation
  });
});

describe('Data Integrity', () => {
  test('detects data tampering', async () => {
    const encrypted = await encryptSettings(mockSettings, { password: validPassword });
    
    // Tamper with encrypted data
    const tamperedData = encrypted.encryptedData.slice(0, -4) + 'abcd';
    const tampered = { ...encrypted, encryptedData: tamperedData };
    
    await expect(
      decryptSettings(tampered, { password: validPassword })
    ).rejects.toThrow(SettingsEncryptionError);
  });

  test('detects tag tampering', async () => {
    const encrypted = await encryptSettings(mockSettings, { password: validPassword });
    
    // Tamper with authentication tag
    const tamperedTag = encrypted.tag.slice(0, -4) + 'abcd';
    const tampered = { ...encrypted, tag: tamperedTag };
    
    await expect(
      decryptSettings(tampered, { password: validPassword })
    ).rejects.toThrow(SettingsEncryptionError);
  });
});