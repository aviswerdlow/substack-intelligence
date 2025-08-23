import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cn,
  formatDate,
  formatDateTime,
  capitalizeFirst,
  truncateText,
  getConfidenceColor,
  getSentimentColor
} from '@/lib/utils';

// Mock clsx and tailwind-merge
vi.mock('clsx', () => ({
  clsx: (...inputs: any[]) => inputs.filter(Boolean).join(' ')
}));

vi.mock('tailwind-merge', () => ({
  twMerge: (input: string) => input
}));

describe('App Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      const result = cn('base-class', 'additional-class');
      expect(result).toBe('base-class additional-class');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      
      const result = cn(
        'button',
        isActive && 'active',
        isDisabled && 'disabled'
      );
      
      expect(result).toBe('button active');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'end');
      expect(result).toBe('base end');
    });

    it('should handle arrays of classes', () => {
      const classes = ['class1', 'class2'];
      const result = cn(...classes, 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });
  });

  describe('formatDate', () => {
    it('should format Date objects', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDate(date);
      
      // The exact format depends on the system locale, but should contain these elements
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format date strings', () => {
      const dateString = '2024-12-25T00:00:00Z';
      const result = formatDate(dateString);
      
      expect(result).toContain('Dec');
      expect(result).toContain('25');
      expect(result).toContain('2024');
    });

    it('should handle ISO date strings', () => {
      const isoDate = '2024-06-30T15:30:00.000Z';
      const result = formatDate(isoDate);
      
      expect(result).toContain('Jun');
      expect(result).toContain('30');
      expect(result).toContain('2024');
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = 'not-a-date';
      const result = formatDate(invalidDate);
      
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatDateTime', () => {
    beforeEach(() => {
      // Mock timezone to ensure consistent results
      vi.stubGlobal('Intl', {
        DateTimeFormat: vi.fn(() => ({
          format: (date: Date) => {
            const d = new Date(date);
            return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
          }
        }))
      });
    });

    it('should format Date objects with time', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatDateTime(date);
      
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time pattern
    });

    it('should format date strings with time', () => {
      const dateString = '2024-12-25T09:45:00Z';
      const result = formatDateTime(dateString);
      
      expect(result).toContain('Dec');
      expect(result).toContain('25');
      expect(result).toContain('2024');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should handle midnight correctly', () => {
      const midnight = '2024-01-01T00:00:00Z';
      const result = formatDateTime(midnight);
      
      expect(result).toContain('Jan');
      expect(result).toContain('1');
      expect(result).toContain('2024');
      expect(result).toMatch(/12:00|00:00/); // Depending on locale
    });

    it('should handle invalid dates', () => {
      const invalidDate = 'invalid';
      const result = formatDateTime(invalidDate);
      
      expect(result).toBe('Invalid Date');
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('world')).toBe('World');
    });

    it('should handle already capitalized strings', () => {
      expect(capitalizeFirst('Hello')).toBe('Hello');
      expect(capitalizeFirst('HELLO')).toBe('HELLO');
    });

    it('should handle single character strings', () => {
      expect(capitalizeFirst('a')).toBe('A');
      expect(capitalizeFirst('Z')).toBe('Z');
    });

    it('should handle empty strings', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('should preserve rest of the string', () => {
      expect(capitalizeFirst('hELLO wORLD')).toBe('HELLO wORLD');
    });

    it('should handle strings with spaces', () => {
      expect(capitalizeFirst(' hello')).toBe(' hello');
      expect(capitalizeFirst('  world')).toBe('  world');
    });

    it('should handle special characters', () => {
      expect(capitalizeFirst('123abc')).toBe('123abc');
      expect(capitalizeFirst('$special')).toBe('$special');
      expect(capitalizeFirst('_underscore')).toBe('_underscore');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that needs to be truncated';
      const result = truncateText(longText, 20);
      
      expect(result).toBe('This is a very long ...');
      expect(result.length).toBe(23); // 20 chars + '...'
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      const result = truncateText(shortText, 20);
      
      expect(result).toBe('Short text');
      expect(result).not.toContain('...');
    });

    it('should handle exact length', () => {
      const text = '12345';
      const result = truncateText(text, 5);
      
      expect(result).toBe('12345');
      expect(result).not.toContain('...');
    });

    it('should handle empty strings', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle zero max length', () => {
      const text = 'Hello';
      const result = truncateText(text, 0);
      
      expect(result).toBe('...');
    });

    it('should handle negative max length', () => {
      const text = 'Hello';
      const result = truncateText(text, -5);
      
      expect(result).toBe('...');
    });

    it('should handle unicode characters', () => {
      const unicodeText = '🚀 Rocket emoji text';
      const result = truncateText(unicodeText, 10);
      
      expect(result).toBe('🚀 Rocket e...');
    });

    it('should preserve word boundaries when possible', () => {
      const text = 'The quick brown fox jumps';
      const result = truncateText(text, 15);
      
      expect(result).toBe('The quick brown...');
    });
  });

  describe('getConfidenceColor', () => {
    it('should return green for high confidence', () => {
      expect(getConfidenceColor(0.8)).toBe('text-green-600');
      expect(getConfidenceColor(0.85)).toBe('text-green-600');
      expect(getConfidenceColor(0.9)).toBe('text-green-600');
      expect(getConfidenceColor(1.0)).toBe('text-green-600');
    });

    it('should return yellow for medium confidence', () => {
      expect(getConfidenceColor(0.6)).toBe('text-yellow-600');
      expect(getConfidenceColor(0.65)).toBe('text-yellow-600');
      expect(getConfidenceColor(0.7)).toBe('text-yellow-600');
      expect(getConfidenceColor(0.79)).toBe('text-yellow-600');
    });

    it('should return red for low confidence', () => {
      expect(getConfidenceColor(0.0)).toBe('text-red-600');
      expect(getConfidenceColor(0.3)).toBe('text-red-600');
      expect(getConfidenceColor(0.5)).toBe('text-red-600');
      expect(getConfidenceColor(0.59)).toBe('text-red-600');
    });

    it('should handle edge cases', () => {
      expect(getConfidenceColor(0.8)).toBe('text-green-600'); // Exactly 0.8
      expect(getConfidenceColor(0.6)).toBe('text-yellow-600'); // Exactly 0.6
      expect(getConfidenceColor(0.599999)).toBe('text-red-600'); // Just below 0.6
    });

    it('should handle out of range values', () => {
      expect(getConfidenceColor(1.5)).toBe('text-green-600'); // Above 1
      expect(getConfidenceColor(-0.5)).toBe('text-red-600'); // Below 0
    });
  });

  describe('getSentimentColor', () => {
    it('should return correct colors for positive sentiment', () => {
      const result = getSentimentColor('positive');
      
      expect(result).toBe('text-green-600 bg-green-50');
      expect(result).toContain('green');
    });

    it('should return correct colors for negative sentiment', () => {
      const result = getSentimentColor('negative');
      
      expect(result).toBe('text-red-600 bg-red-50');
      expect(result).toContain('red');
    });

    it('should return correct colors for neutral sentiment', () => {
      const result = getSentimentColor('neutral');
      
      expect(result).toBe('text-gray-600 bg-gray-50');
      expect(result).toContain('gray');
    });

    it('should handle undefined sentiment as neutral', () => {
      const result = getSentimentColor(undefined as any);
      
      expect(result).toBe('text-gray-600 bg-gray-50');
    });

    it('should handle invalid sentiment as neutral', () => {
      const result = getSentimentColor('invalid' as any);
      
      expect(result).toBe('text-gray-600 bg-gray-50');
    });

    it('should handle case sensitivity', () => {
      // TypeScript enforces literal types, but testing runtime behavior
      const result1 = getSentimentColor('positive' as any);
      const result2 = getSentimentColor('POSITIVE' as any);
      
      expect(result1).toBe('text-green-600 bg-green-50');
      expect(result2).toBe('text-gray-600 bg-gray-50'); // Falls to default
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null inputs gracefully', () => {
      expect(() => formatDate(null as any)).not.toThrow();
      expect(() => formatDateTime(null as any)).not.toThrow();
      expect(() => capitalizeFirst(null as any)).not.toThrow();
      expect(() => truncateText(null as any, 10)).not.toThrow();
    });

    it('should handle undefined inputs gracefully', () => {
      expect(() => formatDate(undefined as any)).not.toThrow();
      expect(() => formatDateTime(undefined as any)).not.toThrow();
      expect(() => capitalizeFirst(undefined as any)).not.toThrow();
      expect(() => truncateText(undefined as any, 10)).not.toThrow();
    });

    it('should handle number inputs', () => {
      const timestamp = Date.now();
      
      // formatDate should handle timestamps
      const dateResult = formatDate(timestamp as any);
      expect(dateResult).toContain('2024'); // Assuming current year
      
      // capitalizeFirst should convert to string
      expect(capitalizeFirst(123 as any)).toBe('123');
      
      // truncateText should convert to string
      expect(truncateText(12345 as any, 3)).toBe('123...');
    });

    it('should handle boolean inputs', () => {
      expect(capitalizeFirst(true as any)).toBe('True');
      expect(capitalizeFirst(false as any)).toBe('False');
      
      expect(truncateText(true as any, 2)).toBe('tr...');
      expect(truncateText(false as any, 3)).toBe('fal...');
    });

    it('should handle object inputs', () => {
      const obj = { toString: () => 'custom string' };
      
      expect(capitalizeFirst(obj as any)).toBe('Custom string');
      expect(truncateText(obj as any, 6)).toBe('custom...');
    });

    it('should handle array inputs', () => {
      const arr = ['a', 'b', 'c'];
      
      expect(capitalizeFirst(arr as any)).toBe('A,b,c');
      expect(truncateText(arr as any, 3)).toBe('a,b...');
    });
  });

  describe('Performance considerations', () => {
    it('should handle very long strings efficiently', () => {
      const veryLongText = 'a'.repeat(10000);
      const start = performance.now();
      
      truncateText(veryLongText, 100);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10); // Should be fast
    });

    it('should handle repeated calls efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        getConfidenceColor(Math.random());
        getSentimentColor(['positive', 'negative', 'neutral'][i % 3] as any);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // Should be fast for 1000 calls
    });
  });
});