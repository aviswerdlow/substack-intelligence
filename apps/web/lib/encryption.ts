import CryptoJS from 'crypto-js';

interface EncryptionResult {
  encrypted: string;
  salt: string;
  iv: string;
  iterations: number;
}

interface DecryptionParams {
  encrypted: string;
  salt: string;
  iv: string;
  iterations: number;
  password: string;
}

const DEFAULT_ITERATIONS = 100000;
const KEY_SIZE = 256 / 32;
const IV_SIZE = 128 / 8;

export function encryptData(data: string, password: string): EncryptionResult {
  if (!password) {
    throw new Error('Password is required for encryption');
  }

  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE,
    iterations: DEFAULT_ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  });

  const iv = CryptoJS.lib.WordArray.random(IV_SIZE);

  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return {
    encrypted: encrypted.toString(),
    salt: salt.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
    iterations: DEFAULT_ITERATIONS
  };
}

export function decryptData(params: DecryptionParams): string {
  const { encrypted, salt: saltStr, iv: ivStr, iterations, password } = params;

  if (!password) {
    throw new Error('Password is required for decryption');
  }

  try {
    const salt = CryptoJS.enc.Base64.parse(saltStr);
    const iv = CryptoJS.enc.Base64.parse(ivStr);

    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: KEY_SIZE,
      iterations: iterations || DEFAULT_ITERATIONS,
      hasher: CryptoJS.algo.SHA256
    });

    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedStr) {
      throw new Error('Failed to decrypt - invalid password or corrupted data');
    }

    return decryptedStr;
  } catch (error) {
    throw new Error('Decryption failed: Invalid password or corrupted file');
  }
}

export function createEncryptedExport(data: any, password: string): string {
  const jsonString = JSON.stringify(data, null, 2);
  const encryptionResult = encryptData(jsonString, password);

  const exportData = {
    version: '1.0',
    encrypted: true,
    algorithm: 'AES-256-CBC',
    kdf: 'PBKDF2',
    ...encryptionResult
  };

  return JSON.stringify(exportData);
}

export function parseEncryptedImport(fileContent: string, password: string): any {
  try {
    const importData = JSON.parse(fileContent);

    if (!importData.encrypted) {
      return JSON.parse(fileContent);
    }

    if (importData.algorithm !== 'AES-256-CBC' || importData.kdf !== 'PBKDF2') {
      throw new Error('Unsupported encryption algorithm');
    }

    const decrypted = decryptData({
      encrypted: importData.encrypted,
      salt: importData.salt,
      iv: importData.iv,
      iterations: importData.iterations,
      password
    });

    return JSON.parse(decrypted);
  } catch (error: any) {
    if (error.message.includes('password')) {
      throw error;
    }
    throw new Error('Failed to parse import file: ' + error.message);
  }
}

export function isEncryptedFile(fileContent: string): boolean {
  try {
    const data = JSON.parse(fileContent);
    return data.encrypted === true && data.algorithm === 'AES-256-CBC';
  } catch {
    return false;
  }
}