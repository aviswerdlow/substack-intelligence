/**
 * Integration tests for Settings Export/Import with Encryption
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettingsExport } from '../useSettingsHooks';
import { createWrapper } from '@/test-utils/react-query-wrapper';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock the settings context
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

const mockExportSettings = vi.fn();
const mockImportSettings = vi.fn();

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: mockSettings,
    exportSettings: mockExportSettings,
    importSettings: mockImportSettings
  })
}));

// Setup crypto polyfill for testing
const crypto = require('crypto').webcrypto;
global.crypto = crypto;

// Mock DOM APIs
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
});

// Mock document.createElement and related DOM methods
const mockLink = {
  href: '',
  download: '',
  click: vi.fn()
};

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => mockLink)
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn()
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn()
});

// Mock File API
global.File = class MockFile {
  constructor(public bits: any[], public name: string, public options: any) {}
  
  text() {
    return Promise.resolve(JSON.stringify(this.bits[0]));
  }
} as any;

global.Blob = class MockBlob {
  constructor(public bits: any[], public options: any) {}
} as any;

describe('useSettingsExport - Encryption Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('exports settings with encryption successfully', async () => {
    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.handleExport('json', {
        encrypt: true,
        password: 'TestPassword123!@#',
        includeSecrets: true,
        prettify: true
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export successful',
        description: 'Encrypted settings exported as json file'
      });
    });

    // Verify the file download was triggered
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('settings-encrypted.json');
    expect(mockLink.click).toHaveBeenCalled();
  });

  test('rejects weak password during export', async () => {
    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.handleExport('json', {
        encrypt: true,
        password: '123', // Weak password
        includeSecrets: true
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Weak password',
        description: expect.stringContaining('Password must be at least'),
        variant: 'destructive'
      });
    });

    // Should not trigger file download
    expect(mockLink.click).not.toHaveBeenCalled();
  });

  test('falls back to normal export when encryption not requested', async () => {
    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.handleExport('json', {
        encrypt: false,
        includeSecrets: false
      });
    });

    // Should call the normal export function
    expect(mockExportSettings).toHaveBeenCalledWith('json');
  });

  test('imports encrypted settings successfully', async () => {
    // First create an encrypted file
    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    let encryptedContent: any;

    // Mock Blob constructor to capture encrypted content
    const originalBlob = global.Blob;
    global.Blob = vi.fn().mockImplementation((bits, options) => {
      encryptedContent = JSON.parse(bits[0]);
      return new originalBlob(bits, options);
    }) as any;

    await act(async () => {
      await result.current.handleExport('json', {
        encrypt: true,
        password: 'TestPassword123!@#',
        includeSecrets: true
      });
    });

    // Now test importing the encrypted file
    const encryptedFile = new File([encryptedContent], 'encrypted-settings.json', {
      type: 'application/json'
    });

    await act(async () => {
      await result.current.handleImport(encryptedFile, {
        decrypt: true,
        password: 'TestPassword123!@#'
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Decryption successful',
        description: 'Settings file has been decrypted'
      });
    });

    // Should call the normal import function with decrypted data
    expect(mockImportSettings).toHaveBeenCalled();
  });

  test('rejects encrypted file without password', async () => {
    const encryptedFile = new File([{
      encrypted: true,
      data: { encryptedData: 'test', salt: 'test', iv: 'test', tag: 'test' }
    }], 'encrypted-settings.json', {
      type: 'application/json'
    });

    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.handleImport(encryptedFile, {
        decrypt: false // No password provided
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Password required',
        description: 'This is an encrypted settings file. Please provide the decryption password.',
        variant: 'destructive'
      });
    });

    expect(mockImportSettings).not.toHaveBeenCalled();
  });

  test('handles incorrect decryption password', async () => {
    const encryptedFile = new File([{
      encrypted: true,
      data: { 
        encryptedData: btoa('invalid'), 
        salt: btoa('invalid'), 
        iv: btoa('invalid'), 
        tag: btoa('invalid') 
      }
    }], 'encrypted-settings.json', {
      type: 'application/json'
    });

    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.handleImport(encryptedFile, {
        decrypt: true,
        password: 'WrongPassword123!@#'
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Decryption failed',
        description: expect.any(String),
        variant: 'destructive'
      });
    });

    expect(mockImportSettings).not.toHaveBeenCalled();
  });

  test('handles invalid JSON file format', async () => {
    const invalidFile = new File(['invalid json'], 'invalid.json', {
      type: 'application/json'
    });

    // Mock file.text() to return invalid JSON
    const originalFile = global.File;
    global.File = class MockFile extends originalFile {
      text() {
        return Promise.resolve('invalid json');
      }
    } as any;

    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.handleImport(invalidFile);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Import failed',
        description: 'Invalid settings file format',
        variant: 'destructive'
      });
    });

    expect(mockImportSettings).not.toHaveBeenCalled();
  });

  test('imports unencrypted settings normally', async () => {
    const unencryptedFile = new File([mockSettings], 'settings.json', {
      type: 'application/json'
    });

    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.handleImport(unencryptedFile);
    });

    // Should call the normal import function
    expect(mockImportSettings).toHaveBeenCalled();
  });

  test('handles loading states correctly', async () => {
    const { result } = renderHook(() => useSettingsExport(), {
      wrapper: createWrapper()
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.isImporting).toBe(false);

    // Test export loading state
    const exportPromise = act(async () => {
      await result.current.handleExport('json', {
        encrypt: true,
        password: 'TestPassword123!@#'
      });
    });

    // Should be loading during export
    expect(result.current.isExporting).toBe(true);

    await exportPromise;

    // Should not be loading after export
    expect(result.current.isExporting).toBe(false);
  });
});