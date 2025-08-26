import * as cheerio from 'cheerio';
import { axiomLogger } from './logging';

/**
 * HTML parsing result interface
 */
interface ParseResult {
  text: string;
  success: boolean;
  method: 'cheerio' | 'regex' | 'fallback';
  error?: string;
}

/**
 * Configuration for HTML parsing
 */
interface ParseOptions {
  removeSelectors?: string[];
  preserveWhitespace?: boolean;
  maxLength?: number;
}

/**
 * Default selectors to remove from HTML content
 */
const DEFAULT_REMOVE_SELECTORS = [
  'script',
  'style',
  'nav',
  'footer',
  'header',
  '.unsubscribe',
  '.footer',
  '.header',
  '[data-testid="unsubscribe"]',
  '.social-links',
  '.sharing-buttons'
];

/**
 * Robust HTML parser with multiple fallback strategies
 */
export class HTMLParser {
  private static instance: HTMLParser;

  private constructor() {}

  public static getInstance(): HTMLParser {
    if (!HTMLParser.instance) {
      HTMLParser.instance = new HTMLParser();
    }
    return HTMLParser.instance;
  }

  /**
   * Parse HTML content and extract clean text with multiple fallback strategies
   */
  async parseHTML(html: string, options: ParseOptions = {}): Promise<ParseResult> {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();
    
    if (!html) {
      return {
        text: '',
        success: true,
        method: 'fallback'
      };
    }

    const config = {
      removeSelectors: options.removeSelectors || DEFAULT_REMOVE_SELECTORS,
      preserveWhitespace: options.preserveWhitespace || false,
      maxLength: options.maxLength || 50000
    };

    // Truncate if HTML is too large
    const truncatedHtml = html.length > config.maxLength ? 
      html.substring(0, config.maxLength) : html;

    const logPerformance = async (method: string, success: boolean, result?: ParseResult) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const memoryAfter = process.memoryUsage();
      const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      const metrics = {
        method,
        success,
        duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
        memoryUsage: Math.round(memoryDelta / 1024), // KB
        htmlLength: truncatedHtml.length,
        textLength: result?.text.length || 0,
        compressionRatio: truncatedHtml.length > 0 ? 
          Math.round(((result?.text.length || 0) / truncatedHtml.length) * 100) / 100 : 0,
        selectorsRemoved: config.removeSelectors.length
      };

      if (success) {
        await axiomLogger.logEmailEvent('html_parsing_success', metrics);
      } else {
        await axiomLogger.logEmailEvent('html_parsing_failed', {
          ...metrics,
          error: result?.error || 'Unknown error'
        });
      }

      // Log performance warnings
      if (duration > 1000) { // > 1 second
        console.warn(`HTML parsing took ${duration}ms - consider optimizing for large content`);
      }
      
      if (memoryDelta > 50 * 1024 * 1024) { // > 50MB
        console.warn(`HTML parsing used ${Math.round(memoryDelta / 1024 / 1024)}MB memory`);
      }
    };

    // Strategy 1: Try cheerio parsing (primary method)
    try {
      const result = await this.parseWithCheerio(truncatedHtml, config);
      if (result.success && result.text.length > 50) {
        await logPerformance('cheerio', true, result);
        return result;
      }
    } catch (error) {
      console.warn('Cheerio parsing failed:', error);
      const errorResult = { 
        text: '', 
        success: false, 
        method: 'cheerio' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      await logPerformance('cheerio', false, errorResult);
    }

    // Strategy 2: Try regex-based parsing (fallback)
    try {
      const result = this.parseWithRegex(truncatedHtml, config);
      if (result.success && result.text.length > 50) {
        await logPerformance('regex', true, result);
        return result;
      }
    } catch (error) {
      console.warn('Regex parsing failed:', error);
      const errorResult = { 
        text: '', 
        success: false, 
        method: 'regex' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      await logPerformance('regex', false, errorResult);
    }

    // Strategy 3: Simple fallback (always works)
    const fallbackResult = this.parseWithFallback(truncatedHtml);
    await logPerformance('fallback', true, fallbackResult);
    
    return fallbackResult;
  }

  /**
   * Primary parsing strategy using cheerio
   */
  private async parseWithCheerio(html: string, config: ParseOptions): Promise<ParseResult> {
    try {
      const $ = cheerio.load(html, {
        xmlMode: false,
        decodeEntities: true
      });

      // Remove unwanted elements
      config.removeSelectors?.forEach(selector => {
        $(selector).remove();
      });

      // Extract text from body first, then fall back to root
      let text = $('body').text() || $.text() || '';

      // Clean up text formatting
      text = this.cleanText(text, config.preserveWhitespace);

      return {
        text,
        success: text.length > 0,
        method: 'cheerio'
      };
    } catch (error) {
      return {
        text: '',
        success: false,
        method: 'cheerio',
        error: error instanceof Error ? error.message : 'Unknown cheerio error'
      };
    }
  }

  /**
   * Regex-based parsing strategy (fallback)
   */
  private parseWithRegex(html: string, config: ParseOptions): ParseResult {
    try {
      let text = html;

      // Remove script and style tags completely
      text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

      // Remove other unwanted elements
      config.removeSelectors?.forEach(selector => {
        if (selector.startsWith('.')) {
          // Class selector - simple approach
          const className = selector.substring(1);
          const classRegex = new RegExp(`<[^>]*class\\s*=\\s*["|'][^"|']*\\b${className}\\b[^"|']*["|'][^>]*>.*?<\/[^>]*>`, 'gis');
          text = text.replace(classRegex, '');
        } else if (selector.startsWith('[')) {
          // Attribute selector - skip for regex (too complex)
        } else {
          // Tag selector
          const tagRegex = new RegExp(`<${selector}\\b[^>]*>.*?<\/${selector}>`, 'gis');
          text = text.replace(tagRegex, '');
        }
      });

      // Remove all remaining HTML tags
      text = text.replace(/<[^>]+>/g, ' ');

      // Decode HTML entities
      text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&hellip;/g, '...');

      // Clean up text
      text = this.cleanText(text, config.preserveWhitespace);

      return {
        text,
        success: text.length > 0,
        method: 'regex'
      };
    } catch (error) {
      return {
        text: '',
        success: false,
        method: 'regex',
        error: error instanceof Error ? error.message : 'Unknown regex error'
      };
    }
  }

  /**
   * Simple fallback strategy that always works
   */
  private parseWithFallback(html: string): ParseResult {
    try {
      // Most basic HTML tag removal
      const text = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&\w+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        text,
        success: true,
        method: 'fallback'
      };
    } catch (error) {
      // This should never happen, but just in case
      return {
        text: html.substring(0, 1000), // Return first 1000 chars as emergency fallback
        success: false,
        method: 'fallback',
        error: 'Even fallback failed'
      };
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanText(text: string, preserveWhitespace = false): string {
    if (!text) return '';

    if (preserveWhitespace) {
      return text.trim();
    }

    return text
      .replace(/\s+/g, ' ')           // Collapse multiple whitespace
      .replace(/\n\s*\n/g, '\n')      // Remove empty lines
      .replace(/^\s+|\s+$/g, '')      // Trim leading/trailing whitespace
      .trim();
  }

  /**
   * Quick method for simple HTML to text conversion (backward compatibility)
   */
  async quickParse(html: string): Promise<string> {
    const result = await this.parseHTML(html);
    return result.text;
  }

  /**
   * Get parser statistics for monitoring
   */
  async getStats(): Promise<{
    cheerioSuccess: number;
    regexFallbacks: number;
    simpleFallbacks: number;
    totalParses: number;
  }> {
    // This would typically be stored in memory or a cache
    // For now, return placeholder stats
    return {
      cheerioSuccess: 0,
      regexFallbacks: 0,
      simpleFallbacks: 0,
      totalParses: 0
    };
  }
}

// Export singleton instance and convenience function
export const htmlParser = HTMLParser.getInstance();

/**
 * Convenience function for quick HTML parsing
 */
export async function parseHTML(html: string, options?: ParseOptions): Promise<string> {
  const result = await htmlParser.parseHTML(html, options);
  return result.text;
}

/**
 * Convenience function for parsing newsletter content specifically
 */
export async function parseNewsletterHTML(html: string): Promise<string> {
  return parseHTML(html, {
    removeSelectors: [
      ...DEFAULT_REMOVE_SELECTORS,
      '.newsletter-header',
      '.newsletter-footer',
      '.subscription-links',
      '.social-media',
      '.advertisement',
      '.ads'
    ]
  });
}