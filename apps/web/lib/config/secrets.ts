import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '../security/environment';

// Encryption utilities for sensitive data
export class SecretsManager {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  private static getEncryptionKey(): Buffer {
    const key = env.security.encryptionKey || process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('Encryption key not configured');
    }
    
    if (key.length !== this.KEY_LENGTH) {
      // Derive key from provided string
      return createHash('sha256').update(key).digest();
    }
    
    return Buffer.from(key, 'utf-8');
  }

  // Encrypt sensitive data before storage
  static encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.IV_LENGTH);
      
      const cipher = createCipheriv(this.ALGORITHM, key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV + encrypted data + auth tag
      return iv.toString('hex') + encrypted + tag.toString('hex');
      
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  // Decrypt sensitive data after retrieval
  static decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      
      // Extract components
      const iv = Buffer.from(encryptedData.slice(0, this.IV_LENGTH * 2), 'hex');
      const tag = Buffer.from(encryptedData.slice(-this.TAG_LENGTH * 2), 'hex');
      const encrypted = encryptedData.slice(this.IV_LENGTH * 2, -this.TAG_LENGTH * 2);
      
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  // Hash sensitive data for secure comparison
  static hash(data: string, salt?: string): string {
    const actualSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(data + actualSalt).digest('hex');
    return `${hash}:${actualSalt}`;
  }

  // Verify hashed data
  static verifyHash(data: string, hashedData: string): boolean {
    try {
      const [hash, salt] = hashedData.split(':');
      const expectedHash = createHash('sha256').update(data + salt).digest('hex');
      return hash === expectedHash;
    } catch (error) {
      return false;
    }
  }

  // Generate secure random secrets
  static generateSecret(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  // Validate secret strength
  static validateSecretStrength(secret: string): {
    isStrong: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 0;

    // Length check
    if (secret.length < 16) {
      issues.push('Secret too short (minimum 16 characters)');
    } else if (secret.length >= 32) {
      score += 30;
    } else {
      score += 20;
    }

    // Character variety
    const hasLowercase = /[a-z]/.test(secret);
    const hasUppercase = /[A-Z]/.test(secret);
    const hasNumbers = /[0-9]/.test(secret);
    const hasSpecialChars = /[^a-zA-Z0-9]/.test(secret);

    const varietyCount = [hasLowercase, hasUppercase, hasNumbers, hasSpecialChars]
      .filter(Boolean).length;

    if (varietyCount < 3) {
      issues.push('Secret should contain lowercase, uppercase, numbers, and special characters');
    } else {
      score += varietyCount * 10;
    }

    // Entropy check
    const entropy = this.calculateEntropy(secret);
    if (entropy < 3.5) {
      issues.push('Secret has low entropy (repetitive patterns)');
    } else {
      score += Math.min(30, entropy * 5);
    }

    // Common patterns
    if (this.hasCommonPatterns(secret)) {
      issues.push('Secret contains common patterns');
      score -= 20;
    }

    const isStrong = issues.length === 0 && score >= 80;
    
    return {
      isStrong,
      issues,
      score: Math.max(0, Math.min(100, score))
    };
  }

  private static calculateEntropy(str: string): number {
    const charFreq = {};
    for (const char of str) {
      charFreq[char] = (charFreq[char] || 0) + 1;
    }

    let entropy = 0;
    const length = str.length;
    
    for (const freq of Object.values(charFreq) as number[]) {
      const probability = freq / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private static hasCommonPatterns(secret: string): boolean {
    const commonPatterns = [
      /123456/,
      /password/i,
      /admin/i,
      /qwerty/i,
      /abc123/i,
      /(.)\1{3,}/, // Repeated characters
      /012345/,
      /987654/
    ];

    return commonPatterns.some(pattern => pattern.test(secret));
  }
}

// Environment-specific configuration management
export class ConfigManager {
  private static configs = new Map<string, any>();

  // Get configuration value with type safety
  static get<T = string>(key: string, defaultValue?: T): T {
    // Check cached configs first
    if (this.configs.has(key)) {
      return this.configs.get(key) as T;
    }

    // Check environment variables
    const envValue = process.env[key];
    if (envValue !== undefined) {
      const parsed = this.parseValue<T>(envValue, defaultValue);
      this.configs.set(key, parsed);
      return parsed;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Configuration key '${key}' not found and no default value provided`);
  }

  // Set configuration value (for testing or dynamic config)
  static set<T>(key: string, value: T): void {
    this.configs.set(key, value);
  }

  // Get required configuration value (throws if missing)
  static getRequired<T = string>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined || value === null || value === '') {
      throw new Error(`Required configuration key '${key}' is missing or empty`);
    }
    return value;
  }

  // Get boolean configuration value
  static getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    
    return Boolean(value);
  }

  // Get number configuration value
  static getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key);
    if (value === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Configuration key '${key}' not found`);
    }
    
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Configuration key '${key}' is not a valid number: ${value}`);
    }
    
    return parsed;
  }

  // Get array configuration value (comma-separated)
  static getArray(key: string, defaultValue: string[] = []): string[] {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(v => v);
    }
    
    return Array.isArray(value) ? value : [String(value)];
  }

  // Get JSON configuration value
  static getJSON<T = any>(key: string, defaultValue?: T): T {
    const value = this.get(key);
    if (value === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Configuration key '${key}' not found`);
    }
    
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        throw new Error(`Configuration key '${key}' is not valid JSON: ${value}`);
      }
    }
    
    return value as T;
  }

  private static parseValue<T>(value: string, defaultValue?: T): T {
    // Try to infer type from default value
    if (defaultValue !== undefined) {
      const defaultType = typeof defaultValue;
      
      if (defaultType === 'boolean') {
        return (value.toLowerCase() === 'true' || value === '1') as unknown as T;
      }
      
      if (defaultType === 'number') {
        const parsed = Number(value);
        return (isNaN(parsed) ? defaultValue : parsed) as unknown as T;
      }
      
      if (Array.isArray(defaultValue)) {
        return value.split(',').map(v => v.trim()).filter(v => v) as unknown as T;
      }
    }
    
    return value as unknown as T;
  }

  // Clear configuration cache
  static clearCache(): void {
    this.configs.clear();
  }

  // Get all configuration keys (for debugging)
  static getAllKeys(): string[] {
    const envKeys = Object.keys(process.env);
    const configKeys = Array.from(this.configs.keys());
    return Array.from(new Set([...envKeys, ...configKeys])).sort();
  }

  // Validate required configurations
  static validateRequired(keys: string[]): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    for (const key of keys) {
      try {
        this.getRequired(key);
      } catch (error) {
        missing.push(key);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
}

// API Key management for external services
export class APIKeyManager {
  private static readonly KEY_PREFIXES = {
    anthropic: 'sk-ant-api03-',
    supabase_anon: 'eyJ',
    supabase_service: 'eyJ',
    resend: 're_',
    upstash: 'AX',
    axiom: 'xaat-'
  };

  // Validate API key format
  static validateKeyFormat(service: keyof typeof this.KEY_PREFIXES, key: string): boolean {
    const expectedPrefix = this.KEY_PREFIXES[service];
    if (!expectedPrefix) return false;
    
    return key.startsWith(expectedPrefix);
  }

  // Get masked version of API key for logging
  static maskKey(key: string): string {
    if (!key || key.length < 8) return '[INVALID_KEY]';
    
    const start = key.slice(0, 8);
    const end = key.slice(-4);
    const middle = '*'.repeat(Math.max(0, key.length - 12));
    
    return `${start}${middle}${end}`;
  }

  // Validate all API keys in environment
  static validateAllKeys(): {
    valid: boolean;
    results: Array<{
      service: string;
      valid: boolean;
      issue?: string;
    }>;
  } {
    const results = [];
    
    const keysToCheck = [
      { service: 'anthropic', key: process.env.ANTHROPIC_API_KEY },
      { service: 'supabase_service', key: process.env.SUPABASE_SERVICE_ROLE_KEY },
      { service: 'resend', key: process.env.RESEND_API_KEY },
      { service: 'axiom', key: process.env.AXIOM_TOKEN }
    ];

    for (const { service, key } of keysToCheck) {
      if (!key) {
        results.push({
          service,
          valid: false,
          issue: 'Key not found in environment'
        });
        continue;
      }

      if (service in this.KEY_PREFIXES) {
        const isValidFormat = this.validateKeyFormat(service as keyof typeof this.KEY_PREFIXES, key);
        results.push({
          service,
          valid: isValidFormat,
          issue: isValidFormat ? undefined : `Invalid key format for ${service}`
        });
      } else {
        results.push({
          service,
          valid: true
        });
      }
    }

    return {
      valid: results.every(r => r.valid),
      results
    };
  }

  // Rotate API key (placeholder for future implementation)
  static async rotateKey(service: string): Promise<{ success: boolean; newKey?: string }> {
    // This would integrate with each service's API to rotate keys
    // For now, return a placeholder response
    console.log(`API key rotation requested for ${service}`);
    
    return {
      success: false,
      // Implementation would depend on each service's key rotation API
    };
  }
}

// Export configured instances
export const secrets = SecretsManager;
export const config = ConfigManager;
export const apiKeys = APIKeyManager;