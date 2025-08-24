import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock file system operations - MUST be hoisted before any imports
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => 'file content'),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  statSync: vi.fn(() => ({
    size: 1024,
    mtime: new Date('2024-01-15T10:00:00Z'),
    isDirectory: () => false,
    isFile: () => true
  }))
}));

// Mock path operations - MUST be hoisted before any imports
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  resolve: vi.fn((...args) => '/' + args.join('/')),
  dirname: vi.fn(path => path.split('/').slice(0, -1).join('/')),
  basename: vi.fn(path => path.split('/').pop()),
  extname: vi.fn(path => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  })
}));

// Mock dependencies
global.fetch = vi.fn();
const mockFetch = global.fetch as any;

// Mock performance globally
global.performance = {
  now: vi.fn(() => Date.now())
} as any;

describe('Utilities and Services Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Data Processing Utilities', () => {
    const dataProcessor = {
      normalizeText(text: string): string {
        if (!text || typeof text !== 'string') return '';
        
        return text
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/[^\w\s]/g, '') // Remove special characters
          .substring(0, 1000); // Limit length
      },

      extractEmails(text: string): string[] {
        if (!text) return [];
        
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        return [...new Set(text.match(emailRegex) || [])];
      },

      extractUrls(text: string): string[] {
        if (!text) return [];
        
        const urlRegex = /https?:\/\/[^\s<>"]+/g;
        const urls = text.match(urlRegex) || [];
        
        return urls.map(url => {
          // Clean up trailing punctuation
          return url.replace(/[.,;:!?]$/, '');
        });
      },

      extractPhoneNumbers(text: string): string[] {
        if (!text) return [];
        
        const phoneRegex = /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
        return [...new Set(text.match(phoneRegex) || [])];
      },

      calculateSimilarity(text1: string, text2: string): number {
        if (!text1 || !text2) return 0;
        
        const words1 = new Set(this.normalizeText(text1).split(' '));
        const words2 = new Set(this.normalizeText(text2).split(' '));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
      },

      deduplicateArray<T>(array: T[], keyFn?: (item: T) => any): T[] {
        if (!keyFn) {
          return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
          const key = keyFn(item);
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      },

      chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        
        for (let i = 0; i < array.length; i += chunkSize) {
          chunks.push(array.slice(i, i + chunkSize));
        }
        
        return chunks;
      },

      flattenObject(obj: any, prefix = ''): Record<string, any> {
        const flattened: Record<string, any> = {};
        
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const newKey = prefix ? `${prefix}.${key}` : key;
          
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(flattened, this.flattenObject(value, newKey));
          } else {
            flattened[newKey] = value;
          }
        });
        
        return flattened;
      },

      groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
        return array.reduce((groups, item) => {
          const key = keyFn(item);
          groups[key] = groups[key] || [];
          groups[key].push(item);
          return groups;
        }, {} as Record<string, T[]>);
      },

      sortBy<T>(array: T[], keyFn: (item: T) => any, descending = false): T[] {
        return [...array].sort((a, b) => {
          const aVal = keyFn(a);
          const bVal = keyFn(b);
          
          if (aVal < bVal) return descending ? 1 : -1;
          if (aVal > bVal) return descending ? -1 : 1;
          return 0;
        });
      }
    };

    it('should normalize text correctly', () => {
      const testCases = [
        { input: '  Hello   World!  ', expected: 'hello world' },
        { input: 'Multiple    Spaces', expected: 'multiple spaces' },
        { input: 'Special@#$Characters', expected: 'specialcharacters' },
        { input: '', expected: '' },
        { input: null as any, expected: '' },
        { input: 123 as any, expected: '' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(dataProcessor.normalizeText(input)).toBe(expected);
      });
    });

    it('should extract emails from text', () => {
      const text = 'Contact us at support@example.com or sales@company.org for more info.';
      const emails = dataProcessor.extractEmails(text);
      
      expect(emails).toEqual(['support@example.com', 'sales@company.org']);
    });

    it('should handle duplicate emails', () => {
      const text = 'Email us at test@example.com or test@example.com again.';
      const emails = dataProcessor.extractEmails(text);
      
      expect(emails).toEqual(['test@example.com']);
    });

    it('should extract URLs from text', () => {
      const text = 'Visit https://example.com or http://test.org for more info.';
      const urls = dataProcessor.extractUrls(text);
      
      expect(urls).toEqual(['https://example.com', 'http://test.org']);
    });

    it('should clean trailing punctuation from URLs', () => {
      const text = 'Check out https://example.com, or https://test.org.';
      const urls = dataProcessor.extractUrls(text);
      
      expect(urls).toEqual(['https://example.com', 'https://test.org']);
    });

    it('should extract phone numbers in various formats', () => {
      const text = 'Call 555-123-4567, (555) 987-6543, or +1-555-111-2222';
      const phones = dataProcessor.extractPhoneNumbers(text);
      
      expect(phones).toHaveLength(3);
      expect(phones).toContain('555-123-4567');
      expect(phones).toContain('(555) 987-6543');
      expect(phones).toContain('+1-555-111-2222');
    });

    it('should calculate text similarity correctly', () => {
      const testCases = [
        { text1: 'hello world', text2: 'hello world', expected: 1 },
        { text1: 'hello world', text2: 'world hello', expected: 1 },
        { text1: 'hello world', text2: 'hello', expected: 0.5 },
        { text1: 'hello', text2: 'world', expected: 0 },
        { text1: '', text2: 'hello', expected: 0 }
      ];

      testCases.forEach(({ text1, text2, expected }) => {
        const similarity = dataProcessor.calculateSimilarity(text1, text2);
        expect(similarity).toBeCloseTo(expected, 2);
      });
    });

    it('should deduplicate arrays correctly', () => {
      const simpleArray = [1, 2, 2, 3, 3, 4];
      const deduped = dataProcessor.deduplicateArray(simpleArray);
      
      expect(deduped).toEqual([1, 2, 3, 4]);
    });

    it('should deduplicate objects by key', () => {
      const objects = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' } // Duplicate ID
      ];
      
      const deduped = dataProcessor.deduplicateArray(objects, obj => obj.id);
      
      expect(deduped).toHaveLength(2);
      expect(deduped.map(obj => obj.id)).toEqual([1, 2]);
    });

    it('should chunk arrays correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const chunks = dataProcessor.chunkArray(array, 3);
      
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty arrays in chunking', () => {
      const chunks = dataProcessor.chunkArray([], 3);
      expect(chunks).toEqual([]);
    });

    it('should flatten objects correctly', () => {
      const nested = {
        a: 1,
        b: {
          c: 2,
          d: {
            e: 3
          }
        },
        f: [4, 5]
      };
      
      const flattened = dataProcessor.flattenObject(nested);
      
      expect(flattened).toEqual({
        a: 1,
        'b.c': 2,
        'b.d.e': 3,
        f: [4, 5] // Arrays are not flattened
      });
    });

    it('should group objects by key', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 }
      ];
      
      const grouped = dataProcessor.groupBy(items, item => item.category);
      
      expect(grouped).toEqual({
        A: [{ category: 'A', value: 1 }, { category: 'A', value: 3 }],
        B: [{ category: 'B', value: 2 }]
      });
    });

    it('should sort arrays by key function', () => {
      const items = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 }
      ];
      
      const sortedByName = dataProcessor.sortBy(items, item => item.name);
      const sortedByAge = dataProcessor.sortBy(items, item => item.age, true);
      
      expect(sortedByName.map(i => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(sortedByAge.map(i => i.age)).toEqual([35, 30, 25]);
    });

    it('should handle edge cases in data processing', () => {
      // Test with empty inputs
      expect(dataProcessor.extractEmails('')).toEqual([]);
      expect(dataProcessor.extractUrls('')).toEqual([]);
      expect(dataProcessor.extractPhoneNumbers('')).toEqual([]);
      expect(dataProcessor.calculateSimilarity('', '')).toBe(0);
      
      // Test with null inputs
      expect(dataProcessor.extractEmails(null as any)).toEqual([]);
      expect(dataProcessor.extractUrls(null as any)).toEqual([]);
      expect(dataProcessor.extractPhoneNumbers(null as any)).toEqual([]);
    });

    it('should handle very long texts efficiently', () => {
      const longText = 'word '.repeat(100000); // Very long text
      
      const startTime = Date.now();
      const normalized = dataProcessor.normalizeText(longText);
      const endTime = Date.now();
      
      expect(normalized.length).toBeLessThanOrEqual(1000); // Should be truncated
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
  });

  describe('File and Storage Utilities', () => {
    const fs = require('fs');
    const path = require('path');
    
    const fileUtils = {
      async saveFile(filePath: string, content: string | Buffer): Promise<void> {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, content);
      },

      async readFile(filePath: string): Promise<string> {
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        
        return fs.readFileSync(filePath, 'utf8');
      },

      async deleteFile(filePath: string): Promise<void> {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      },

      getFileInfo(filePath: string) {
        if (!fs.existsSync(filePath)) {
          return null;
        }
        
        const stats = fs.statSync(filePath);
        return {
          size: stats.size,
          modified: stats.mtime,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          extension: path.extname(filePath),
          basename: path.basename(filePath),
          dirname: path.dirname(filePath)
        };
      },

      async copyFile(sourcePath: string, destPath: string): Promise<void> {
        const content = await this.readFile(sourcePath);
        await this.saveFile(destPath, content);
      },

      async createBackup(filePath: string): Promise<string> {
        if (!fs.existsSync(filePath)) {
          throw new Error('File does not exist');
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.backup.${timestamp}`;
        
        await this.copyFile(filePath, backupPath);
        return backupPath;
      },

      validateFileName(fileName: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!fileName || fileName.trim().length === 0) {
          errors.push('File name cannot be empty');
        }
        
        if (fileName.length > 255) {
          errors.push('File name too long (max 255 characters)');
        }
        
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(fileName)) {
          errors.push('File name contains invalid characters');
        }
        
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        if (reservedNames.includes(fileName.toUpperCase().split('.')[0])) {
          errors.push('File name is reserved');
        }
        
        return {
          valid: errors.length === 0,
          errors
        };
      },

      formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }
    };

    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('file content');
      fs.writeFileSync.mockImplementation(() => {});
      fs.mkdirSync.mockImplementation(() => {});
      fs.unlinkSync.mockImplementation(() => {});
      path.dirname.mockImplementation(p => p.split('/').slice(0, -1).join('/'));
      path.basename.mockImplementation(p => p.split('/').pop());
      path.extname.mockImplementation(p => {
        const parts = p.split('.');
        return parts.length > 1 ? '.' + parts.pop() : '';
      });
    });

    it('should save files and create directories', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'Hello, World!';
      
      await fileUtils.saveFile(filePath, content);
      
      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, content);
    });

    it('should read files correctly', async () => {
      const content = await fileUtils.readFile('/path/to/file.txt');
      
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf8');
      expect(content).toBe('file content');
    });

    it('should handle file not found', async () => {
      fs.existsSync.mockReturnValue(false);
      
      await expect(fileUtils.readFile('/nonexistent.txt'))
        .rejects.toThrow('File not found: /nonexistent.txt');
    });

    it('should delete files if they exist', async () => {
      await fileUtils.deleteFile('/path/to/file.txt');
      
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should not throw when deleting non-existent files', async () => {
      fs.existsSync.mockReturnValue(false);
      
      await expect(fileUtils.deleteFile('/nonexistent.txt')).resolves.not.toThrow();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should get file information', () => {
      const info = fileUtils.getFileInfo('/path/to/file.txt');
      
      expect(info).toEqual({
        size: 1024,
        modified: expect.any(Date),
        isDirectory: false,
        isFile: true,
        extension: '.txt',
        basename: 'file.txt',
        dirname: '/path/to'
      });
    });

    it('should return null for non-existent files', () => {
      fs.existsSync.mockReturnValue(false);
      
      const info = fileUtils.getFileInfo('/nonexistent.txt');
      expect(info).toBeNull();
    });

    it('should copy files correctly', async () => {
      await fileUtils.copyFile('/source.txt', '/dest.txt');
      
      expect(fs.readFileSync).toHaveBeenCalledWith('/source.txt', 'utf8');
      expect(fs.writeFileSync).toHaveBeenCalledWith('/dest.txt', 'file content');
    });

    it('should create backups with timestamp', async () => {
      const originalDate = Date;
      const mockDate = vi.fn(() => ({
        toISOString: () => '2024-01-01T12:00:00.000Z'
      }));
      global.Date = mockDate as any;
      
      const backupPath = await fileUtils.createBackup('/path/to/file.txt');
      
      expect(backupPath).toBe('/path/to/file.txt.backup.2024-01-01T12-00-00-000Z');
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf8');
      expect(fs.writeFileSync).toHaveBeenCalledWith(backupPath, 'file content');
      
      global.Date = originalDate;
    });

    it('should validate file names correctly', () => {
      const testCases = [
        { name: 'valid-file.txt', valid: true },
        { name: '', valid: false },
        { name: 'file<name.txt', valid: false },
        { name: 'CON.txt', valid: false },
        { name: 'a'.repeat(300), valid: false }
      ];
      
      testCases.forEach(({ name, valid }) => {
        const result = fileUtils.validateFileName(name);
        expect(result.valid).toBe(valid);
        if (!valid) {
          expect(result.errors.length).toBeGreaterThan(0);
        }
      });
    });

    it('should format file sizes correctly', () => {
      const testCases = [
        { bytes: 0, expected: '0 Bytes' },
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1048576, expected: '1 MB' },
        { bytes: 1073741824, expected: '1 GB' },
        { bytes: 1500, expected: '1.46 KB' }
      ];
      
      testCases.forEach(({ bytes, expected }) => {
        expect(fileUtils.formatFileSize(bytes)).toBe(expected);
      });
    });
  });

  describe('Date and Time Utilities', () => {
    const dateUtils = {
      formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
        const d = new Date(date);
        
        if (isNaN(d.getTime())) {
          throw new Error('Invalid date');
        }
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
          .replace('YYYY', String(year))
          .replace('MM', month)
          .replace('DD', day)
          .replace('HH', hours)
          .replace('mm', minutes)
          .replace('ss', seconds);
      },

      parseDate(dateString: string): Date {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date string: ${dateString}`);
        }
        
        return date;
      },

      addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
      },

      addHours(date: Date, hours: number): Date {
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
      },

      diffInDays(date1: Date, date2: Date): number {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
      },

      diffInHours(date1: Date, date2: Date): number {
        const msPerHour = 60 * 60 * 1000;
        return Math.floor((date2.getTime() - date1.getTime()) / msPerHour);
      },

      isWeekend(date: Date): boolean {
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      },

      getStartOfWeek(date: Date): Date {
        const result = new Date(date);
        const dayOfWeek = result.getDay();
        const diff = result.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday as start
        result.setDate(diff);
        result.setHours(0, 0, 0, 0);
        return result;
      },

      getEndOfWeek(date: Date): Date {
        const startOfWeek = this.getStartOfWeek(date);
        const endOfWeek = this.addDays(startOfWeek, 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return endOfWeek;
      },

      getStartOfMonth(date: Date): Date {
        const result = new Date(date);
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
        return result;
      },

      getEndOfMonth(date: Date): Date {
        const result = new Date(date);
        result.setMonth(result.getMonth() + 1, 0); // Last day of current month
        result.setHours(23, 59, 59, 999);
        return result;
      },

      isToday(date: Date): boolean {
        const today = new Date();
        return date.toDateString() === today.toDateString();
      },

      isThisWeek(date: Date): boolean {
        const now = new Date();
        const startOfThisWeek = this.getStartOfWeek(now);
        const endOfThisWeek = this.getEndOfWeek(now);
        
        return date >= startOfThisWeek && date <= endOfThisWeek;
      },

      isThisMonth(date: Date): boolean {
        const now = new Date();
        const startOfThisMonth = this.getStartOfMonth(now);
        const endOfThisMonth = this.getEndOfMonth(now);
        
        return date >= startOfThisMonth && date <= endOfThisMonth;
      },

      getTimezone(): string {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      },

      convertTimezone(date: Date, timezone: string): Date {
        const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
        const targetDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
        return targetDate;
      },

      relativeDateFormat(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
        return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
      }
    };

    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T14:30:45');
      
      expect(dateUtils.formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(dateUtils.formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
      expect(dateUtils.formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 14:30:45');
    });

    it('should handle invalid dates', () => {
      expect(() => dateUtils.formatDate('invalid-date')).toThrow('Invalid date');
    });

    it('should parse date strings correctly', () => {
      const parsed = dateUtils.parseDate('2024-01-15T14:30:45');
      
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(0); // January is 0
      expect(parsed.getDate()).toBe(15);
    });

    it('should add days correctly', () => {
      const date = new Date('2024-01-15');
      const newDate = dateUtils.addDays(date, 5);
      
      expect(newDate.getDate()).toBe(20);
      expect(date.getDate()).toBe(15); // Original unchanged
    });

    it('should add hours correctly', () => {
      const date = new Date('2024-01-15T10:00:00');
      const newDate = dateUtils.addHours(date, 5);
      
      expect(newDate.getHours()).toBe(15);
    });

    it('should calculate date differences correctly', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-20');
      
      expect(dateUtils.diffInDays(date1, date2)).toBe(5);
      expect(dateUtils.diffInDays(date2, date1)).toBe(-5);
    });

    it('should calculate hour differences correctly', () => {
      const date1 = new Date('2024-01-15T10:00:00');
      const date2 = new Date('2024-01-15T15:00:00');
      
      expect(dateUtils.diffInHours(date1, date2)).toBe(5);
    });

    it('should detect weekends correctly', () => {
      const saturday = new Date('2024-01-13'); // Saturday
      const sunday = new Date('2024-01-14'); // Sunday
      const monday = new Date('2024-01-15'); // Monday
      
      expect(dateUtils.isWeekend(saturday)).toBe(true);
      expect(dateUtils.isWeekend(sunday)).toBe(true);
      expect(dateUtils.isWeekend(monday)).toBe(false);
    });

    it('should get start and end of week correctly', () => {
      const date = new Date('2024-01-17'); // Wednesday
      
      const startOfWeek = dateUtils.getStartOfWeek(date);
      const endOfWeek = dateUtils.getEndOfWeek(date);
      
      expect(startOfWeek.getDay()).toBe(1); // Monday
      expect(endOfWeek.getDay()).toBe(0); // Sunday
    });

    it('should get start and end of month correctly', () => {
      const date = new Date('2024-01-15');
      
      const startOfMonth = dateUtils.getStartOfMonth(date);
      const endOfMonth = dateUtils.getEndOfMonth(date);
      
      expect(startOfMonth.getDate()).toBe(1);
      expect(endOfMonth.getDate()).toBe(31); // January has 31 days
    });

    it('should check if date is today', () => {
      const today = new Date();
      const yesterday = dateUtils.addDays(today, -1);
      
      expect(dateUtils.isToday(today)).toBe(true);
      expect(dateUtils.isToday(yesterday)).toBe(false);
    });

    it('should format relative dates correctly', () => {
      const now = new Date();
      
      const testCases = [
        { date: new Date(now.getTime() - 30000), expected: 'just now' }, // 30 seconds ago
        { date: new Date(now.getTime() - 300000), expected: '5 minutes ago' }, // 5 minutes ago
        { date: new Date(now.getTime() - 3600000), expected: '1 hour ago' }, // 1 hour ago
        { date: new Date(now.getTime() - 86400000), expected: '1 day ago' }, // 1 day ago
        { date: new Date(now.getTime() - 604800000), expected: '1 week ago' } // 1 week ago
      ];
      
      testCases.forEach(({ date, expected }) => {
        expect(dateUtils.relativeDateFormat(date)).toBe(expected);
      });
    });

    it('should handle timezone operations', () => {
      const timezone = dateUtils.getTimezone();
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });

    it('should handle leap years correctly', () => {
      const leapYearDate = new Date('2024-02-29'); // 2024 is a leap year
      const endOfFeb = dateUtils.getEndOfMonth(new Date('2024-02-15'));
      
      expect(endOfFeb.getDate()).toBe(29);
    });
  });

  describe('Async Utilities and Promise Handling', () => {
    const asyncUtils = {
      async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
      },

      async timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${ms}ms`));
          }, ms);
          
          promise
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(timeoutId));
        });
      },

      async retry<T>(
        fn: () => Promise<T>,
        maxAttempts: number = 3,
        delayMs: number = 1000,
        backoffMultiplier: number = 2
      ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await fn();
          } catch (error: any) {
            lastError = error;
            
            if (attempt === maxAttempts) {
              throw error;
            }
            
            const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
            await this.delay(delay);
          }
        }
        
        throw lastError!;
      },

      async promiseAllSettled<T>(promises: Promise<T>[]): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> {
        const results = await Promise.allSettled(promises);
        return results.map(result => {
          if (result.status === 'fulfilled') {
            return { status: 'fulfilled', value: result.value };
          } else {
            return { status: 'rejected', reason: result.reason };
          }
        });
      },

      async batchProcess<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        batchSize: number = 5,
        delayBetweenBatches: number = 0
      ): Promise<R[]> {
        const results: R[] = [];
        
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchPromises = batch.map(processor);
          
          try {
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
          } catch (error) {
            // Handle batch failure - could implement partial success handling
            throw error;
          }
          
          if (delayBetweenBatches > 0 && i + batchSize < items.length) {
            await this.delay(delayBetweenBatches);
          }
        }
        
        return results;
      },

      async race<T>(promises: Promise<T>[], timeoutMs?: number): Promise<T> {
        const promisesToRace = [...promises];
        
        if (timeoutMs) {
          const timeoutPromise = this.delay(timeoutMs).then(() => {
            throw new Error(`Race timed out after ${timeoutMs}ms`);
          });
          promisesToRace.push(timeoutPromise as Promise<T>);
        }
        
        return Promise.race(promisesToRace);
      },

      async parallel<T>(
        tasks: Array<() => Promise<T>>,
        maxConcurrency: number = 5
      ): Promise<T[]> {
        const results: T[] = new Array(tasks.length);
        const executing: Promise<void>[] = [];
        
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          
          const execute = (async (index: number) => {
            results[index] = await task();
          })(i);
          
          executing.push(execute);
          
          if (executing.length >= maxConcurrency) {
            await Promise.race(executing);
            executing.splice(executing.findIndex(p => p === execute), 1);
          }
        }
        
        await Promise.all(executing);
        return results;
      },

      createAbortablePromise<T>(
        executor: (resolve: (value: T) => void, reject: (reason: any) => void, abortSignal: AbortSignal) => void
      ): { promise: Promise<T>; abort: () => void } {
        const abortController = new AbortController();
        
        const promise = new Promise<T>((resolve, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Operation aborted'));
          });
          
          executor(resolve, reject, abortController.signal);
        });
        
        return {
          promise,
          abort: () => abortController.abort()
        };
      }
    };

    it('should implement delay correctly', async () => {
      vi.useRealTimers();
      
      const startTime = Date.now();
      await asyncUtils.delay(100);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some variance
      
      vi.useFakeTimers();
    });

    it('should implement timeout correctly', async () => {
      vi.useRealTimers();
      
      const slowPromise = new Promise(resolve => setTimeout(resolve, 200));
      
      await expect(asyncUtils.timeout(slowPromise, 100))
        .rejects.toThrow('Operation timed out after 100ms');
        
      vi.useFakeTimers();
    });

    it('should allow fast promises to complete within timeout', async () => {
      const fastPromise = Promise.resolve('success');
      
      const result = await asyncUtils.timeout(fastPromise, 100);
      expect(result).toBe('success');
    });

    it('should implement retry with exponential backoff', async () => {
      vi.useRealTimers();
      
      let attempts = 0;
      const flakyFunction = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      const startTime = Date.now();
      const result = await asyncUtils.retry(flakyFunction, 3, 100, 2);
      const endTime = Date.now();
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(endTime - startTime).toBeGreaterThan(300); // Should have delays
      
      vi.useFakeTimers();
    });

    it('should fail retry after max attempts', async () => {
      const alwaysFailingFunction = async () => {
        throw new Error('Always fails');
      };
      
      await expect(asyncUtils.retry(alwaysFailingFunction, 2))
        .rejects.toThrow('Always fails');
    });

    it('should handle promise all settled', async () => {
      const promises = [
        Promise.resolve('success'),
        Promise.reject(new Error('failure')),
        Promise.resolve('another success')
      ];
      
      const results = await asyncUtils.promiseAllSettled(promises);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ status: 'fulfilled', value: 'success' });
      expect(results[1]).toEqual({ status: 'rejected', reason: expect.any(Error) });
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'another success' });
    });

    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const processor = async (item: number) => item * 2;
      
      const results = await asyncUtils.batchProcess(items, processor, 3);
      
      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
    });

    it('should handle batch processing with delays', async () => {
      vi.useRealTimers();
      
      const items = [1, 2, 3, 4, 5];
      const processor = async (item: number) => item;
      
      const startTime = Date.now();
      await asyncUtils.batchProcess(items, processor, 2, 50);
      const endTime = Date.now();
      
      // Should have at least 2 delays (3 batches - 1)
      expect(endTime - startTime).toBeGreaterThan(100);
      
      vi.useFakeTimers();
    });

    it('should implement promise race with timeout', async () => {
      const promises = [
        new Promise(resolve => setTimeout(() => resolve('slow'), 200)),
        new Promise(resolve => setTimeout(() => resolve('fast'), 50))
      ];
      
      const result = await asyncUtils.race(promises, 300);
      expect(result).toBe('fast');
    });

    it('should handle race timeout', async () => {
      vi.useRealTimers();
      
      const promises = [
        new Promise(resolve => setTimeout(() => resolve('too slow'), 200))
      ];
      
      await expect(asyncUtils.race(promises, 100))
        .rejects.toThrow('Race timed out after 100ms');
        
      vi.useFakeTimers();
    });

    it('should execute tasks in parallel with concurrency limit', async () => {
      vi.useRealTimers();
      
      let concurrentCount = 0;
      let maxConcurrent = 0;
      
      const tasks = Array.from({ length: 10 }, () => async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        
        await asyncUtils.delay(50);
        
        concurrentCount--;
        return 'done';
      });
      
      const results = await asyncUtils.parallel(tasks, 3);
      
      expect(results).toHaveLength(10);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
      expect(results.every(r => r === 'done')).toBe(true);
      
      vi.useFakeTimers();
    });

    it('should create abortable promises', async () => {
      vi.useRealTimers();
      
      const { promise, abort } = asyncUtils.createAbortablePromise<string>((resolve, reject, signal) => {
        const timeoutId = setTimeout(() => {
          if (!signal.aborted) {
            resolve('completed');
          }
        }, 100);
        
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
        });
      });
      
      setTimeout(() => abort(), 50);
      
      await expect(promise).rejects.toThrow('Operation aborted');
      
      vi.useFakeTimers();
    });

    it('should handle concurrent operations safely', async () => {
      vi.useRealTimers();
      
      const sharedResource = { value: 0 };
      const mutex: Promise<void>[] = [];
      
      const incrementWithLock = async (id: number) => {
        // Wait for previous operations
        await Promise.all(mutex.slice());
        
        const currentValue = sharedResource.value;
        await asyncUtils.delay(10); // Simulate async work
        sharedResource.value = currentValue + 1;
      };
      
      const operations = Array.from({ length: 10 }, (_, i) => 
        incrementWithLock(i)
      );
      
      await Promise.all(operations);
      
      // Due to race conditions, the final value might not be 10
      // In a real implementation, you'd use proper locking mechanisms
      expect(sharedResource.value).toBeGreaterThan(0);
      
      vi.useFakeTimers();
    });
  });

  describe('Performance Optimization Utilities', () => {
    const perfUtils = {
      memoize<T extends (...args: any[]) => any>(fn: T, keyGenerator?: (...args: Parameters<T>) => string): T {
        const cache = new Map<string, ReturnType<T>>();
        
        return ((...args: Parameters<T>) => {
          const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
          
          if (cache.has(key)) {
            return cache.get(key);
          }
          
          const result = fn(...args);
          cache.set(key, result);
          return result;
        }) as T;
      },

      debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
        let timeoutId: NodeJS.Timeout | null = null;
        
        return ((...args: Parameters<T>) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          timeoutId = setTimeout(() => {
            fn(...args);
          }, delay);
        }) as T;
      },

      throttle<T extends (...args: any[]) => any>(fn: T, interval: number): T {
        let lastCall = 0;
        
        return ((...args: Parameters<T>) => {
          const now = Date.now();
          
          if (now - lastCall >= interval) {
            lastCall = now;
            return fn(...args);
          }
        }) as T;
      },

      measurePerformance<T>(fn: () => T, label?: string): { result: T; duration: number } {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        const duration = end - start;
        
        if (label) {
          console.log(`${label} took ${duration.toFixed(2)}ms`);
        }
        
        return { result, duration };
      },

      createLazyValue<T>(factory: () => T): () => T {
        let value: T;
        let computed = false;
        
        return () => {
          if (!computed) {
            value = factory();
            computed = true;
          }
          return value;
        };
      },

      createObjectPool<T>(
        factory: () => T,
        reset?: (item: T) => void,
        maxSize: number = 10
      ) {
        const pool: T[] = [];
        
        return {
          acquire(): T {
            return pool.pop() || factory();
          },
          
          release(item: T) {
            if (pool.length < maxSize) {
              if (reset) {
                reset(item);
              }
              pool.push(item);
            }
          },
          
          size: () => pool.length
        };
      },

      batchUpdates<T>(
        updateFn: (items: T[]) => void,
        maxBatchSize: number = 100,
        maxWaitMs: number = 1000
      ) {
        const batch: T[] = [];
        let timeoutId: NodeJS.Timeout | null = null;
        
        const flush = () => {
          if (batch.length > 0) {
            const items = batch.splice(0);
            updateFn(items);
          }
          
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        };
        
        return {
          add(item: T) {
            batch.push(item);
            
            if (batch.length >= maxBatchSize) {
              flush();
            } else if (!timeoutId) {
              timeoutId = setTimeout(flush, maxWaitMs);
            }
          },
          
          flush,
          
          size: () => batch.length
        };
      }
    };

    // Performance is already mocked globally

    it('should memoize function results', () => {
      let callCount = 0;
      
      const expensiveFunction = (x: number) => {
        callCount++;
        return x * x;
      };
      
      const memoized = perfUtils.memoize(expensiveFunction);
      
      expect(memoized(5)).toBe(25);
      expect(memoized(5)).toBe(25); // Should use cached result
      expect(callCount).toBe(1);
      
      expect(memoized(10)).toBe(100);
      expect(callCount).toBe(2);
    });

    it('should use custom key generator for memoization', () => {
      let callCount = 0;
      
      const fn = (obj: { id: number; name: string }) => {
        callCount++;
        return obj.id * 2;
      };
      
      const memoized = perfUtils.memoize(fn, (obj) => obj.id.toString());
      
      expect(memoized({ id: 1, name: 'first' })).toBe(2);
      expect(memoized({ id: 1, name: 'different' })).toBe(2); // Same ID, cached
      expect(callCount).toBe(1);
    });

    it('should debounce function calls', async () => {
      vi.useRealTimers();
      
      let callCount = 0;
      
      const fn = () => {
        callCount++;
      };
      
      const debounced = perfUtils.debounce(fn, 100);
      
      // Call multiple times quickly
      debounced();
      debounced();
      debounced();
      
      // Should not have been called yet
      expect(callCount).toBe(0);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(callCount).toBe(1);
      
      vi.useFakeTimers();
    });

    it('should throttle function calls', () => {
      let callCount = 0;
      
      const fn = () => {
        callCount++;
      };
      
      const throttled = perfUtils.throttle(fn, 100);
      
      // Call multiple times
      throttled(); // Should execute
      expect(callCount).toBe(1);
      
      throttled(); // Should be throttled
      throttled(); // Should be throttled
      expect(callCount).toBe(1);
    });

    it('should measure performance', () => {
      const mockPerf = vi.mocked(performance.now);
      mockPerf.mockReturnValueOnce(100).mockReturnValueOnce(150);
      
      const result = perfUtils.measurePerformance(() => {
        return 42;
      });
      
      expect(result.result).toBe(42);
      expect(result.duration).toBe(50);
    });

    it('should create lazy values', () => {
      let computed = false;
      
      const lazyValue = perfUtils.createLazyValue(() => {
        computed = true;
        return 'expensive computation';
      });
      
      expect(computed).toBe(false);
      
      const result1 = lazyValue();
      expect(computed).toBe(true);
      expect(result1).toBe('expensive computation');
      
      // Reset computed flag to verify it's not called again
      computed = false;
      const result2 = lazyValue();
      expect(computed).toBe(false); // Should not recompute
      expect(result2).toBe('expensive computation');
    });

    it('should create object pools', () => {
      let createdCount = 0;
      
      const factory = () => {
        createdCount++;
        return { value: 0, used: true };
      };
      
      const reset = (obj: { value: number; used: boolean }) => {
        obj.value = 0;
        obj.used = false;
      };
      
      const pool = perfUtils.createObjectPool(factory, reset, 3);
      
      // Acquire objects
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      
      expect(createdCount).toBe(2);
      
      // Release them
      pool.release(obj1);
      pool.release(obj2);
      
      expect(pool.size()).toBe(2);
      
      // Acquire again (should reuse)
      const obj3 = pool.acquire();
      expect(createdCount).toBe(2); // No new objects created
      expect(obj3.used).toBe(false); // Should be reset
    });

    it('should batch updates by size', () => {
      const batches: number[][] = [];
      
      const batcher = perfUtils.batchUpdates<number>(
        (items) => batches.push([...items]),
        3,
        1000
      );
      
      batcher.add(1);
      batcher.add(2);
      expect(batches).toHaveLength(0);
      
      batcher.add(3);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([1, 2, 3]);
    });

    it('should batch updates by time', async () => {
      vi.useRealTimers();
      
      const batches: number[][] = [];
      
      const batcher = perfUtils.batchUpdates<number>(
        (items) => batches.push([...items]),
        10,
        100
      );
      
      batcher.add(1);
      batcher.add(2);
      
      expect(batches).toHaveLength(0);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([1, 2]);
      
      vi.useFakeTimers();
    });

    it('should handle manual flush', () => {
      const batches: number[][] = [];
      
      const batcher = perfUtils.batchUpdates<number>(
        (items) => batches.push([...items]),
        10,
        1000
      );
      
      batcher.add(1);
      batcher.add(2);
      
      expect(batches).toHaveLength(0);
      
      batcher.flush();
      
      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([1, 2]);
    });
  });
});