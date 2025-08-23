/**
 * Settings Encryption Module
 * 
 * Provides secure encryption/decryption for sensitive settings data using AES-256-GCM.
 * Uses PBKDF2 for password-based key derivation with cryptographically secure salts.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum

export interface EncryptionResult {
  encryptedData: string;
  salt: string;
  iv: string;
  tag: string;
}

export interface EncryptionOptions {
  password: string;
}

export class SettingsEncryptionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SettingsEncryptionError';
  }
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generates a cryptographically secure random buffer
 */
function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  
  // Fallback for Node.js environments
  if (typeof require !== 'undefined') {
    const nodeCrypto = require('crypto');
    return new Uint8Array(nodeCrypto.randomBytes(length));
  }
  
  throw new SettingsEncryptionError('No secure random number generator available');
}

/**
 * Derives an encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  try {
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive AES key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Clear password from memory
    passwordBuffer.fill(0);
    
    return key;
  } catch (error) {
    // Clear password from memory on error
    passwordBuffer.fill(0);
    throw new SettingsEncryptionError('Failed to derive encryption key', error as Error);
  }
}

/**
 * Identifies sensitive fields that should be encrypted
 */
function getSensitiveFields(settings: any): string[] {
  const sensitivePatterns = [
    'apiKey',
    'password',
    'token',
    'secret',
    'key',
    'webhook',
    'url'
  ];
  
  const sensitiveFields: string[] = [];
  
  function traverse(obj: any, path: string = '') {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if field name indicates sensitive data
      const isSensitive = sensitivePatterns.some(pattern => 
        key.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isSensitive && (typeof value === 'string' || typeof value === 'number')) {
        sensitiveFields.push(currentPath);
      } else if (typeof value === 'object' && value !== null) {
        traverse(value, currentPath);
      }
    }
  }
  
  traverse(settings);
  return sensitiveFields;
}

/**
 * Encrypts settings data
 */
export async function encryptSettings(
  settings: any,
  options: EncryptionOptions
): Promise<EncryptionResult> {
  try {
    // Validate password strength
    const passwordValidation = validatePassword(options.password);
    if (!passwordValidation.valid) {
      throw new SettingsEncryptionError(
        `Weak password: ${passwordValidation.errors.join(', ')}`
      );
    }
    
    // Generate random salt and IV
    const salt = getRandomBytes(SALT_LENGTH);
    const iv = getRandomBytes(IV_LENGTH);
    
    // Derive encryption key
    const key = await deriveKey(options.password, salt);
    
    // Prepare data for encryption
    const dataToEncrypt = JSON.stringify(settings);
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(dataToEncrypt);
    
    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH * 8 // Convert bytes to bits
      },
      key,
      plaintextBuffer
    );
    
    // Extract encrypted data and authentication tag
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedData = encryptedArray.slice(0, -TAG_LENGTH);
    const tag = encryptedArray.slice(-TAG_LENGTH);
    
    // Convert to base64 for storage
    return {
      encryptedData: btoa(String.fromCharCode(...encryptedData)),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
      tag: btoa(String.fromCharCode(...tag))
    };
    
  } catch (error) {
    if (error instanceof SettingsEncryptionError) {
      throw error;
    }
    throw new SettingsEncryptionError('Encryption failed', error as Error);
  }
}

/**
 * Decrypts settings data
 */
export async function decryptSettings(
  encryptionResult: EncryptionResult,
  options: EncryptionOptions
): Promise<any> {
  try {
    // Convert from base64
    const salt = new Uint8Array(
      atob(encryptionResult.salt).split('').map(c => c.charCodeAt(0))
    );
    const iv = new Uint8Array(
      atob(encryptionResult.iv).split('').map(c => c.charCodeAt(0))
    );
    const encryptedData = new Uint8Array(
      atob(encryptionResult.encryptedData).split('').map(c => c.charCodeAt(0))
    );
    const tag = new Uint8Array(
      atob(encryptionResult.tag).split('').map(c => c.charCodeAt(0))
    );
    
    // Derive decryption key
    const key = await deriveKey(options.password, salt);
    
    // Combine encrypted data and tag
    const ciphertext = new Uint8Array(encryptedData.length + tag.length);
    ciphertext.set(encryptedData);
    ciphertext.set(tag, encryptedData.length);
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH * 8 // Convert bytes to bits
      },
      key,
      ciphertext
    );
    
    // Convert back to string and parse JSON
    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);
    
    return JSON.parse(decryptedString);
    
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new SettingsEncryptionError('Incorrect password or corrupted data');
    }
    throw new SettingsEncryptionError('Decryption failed', error as Error);
  }
}

/**
 * Creates metadata about encrypted settings
 */
export function createEncryptionMetadata(sensitiveFields: string[]) {
  return {
    version: '1.0',
    algorithm: ALGORITHM,
    keyDerivation: 'PBKDF2',
    iterations: PBKDF2_ITERATIONS,
    encryptedAt: new Date().toISOString(),
    sensitiveFields
  };
}

/**
 * Securely clears sensitive data from memory
 */
export function secureClear(data: any) {
  if (typeof data === 'string') {
    // For strings, we can't actually clear them in JS, but we can indicate intent
    return;
  }
  
  if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
    // Clear buffer contents
    const view = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer);
    view.fill(0);
    return;
  }
  
  if (typeof data === 'object' && data !== null) {
    // Recursively clear object properties
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        secureClear(data[key]);
        delete data[key];
      }
    }
  }
}