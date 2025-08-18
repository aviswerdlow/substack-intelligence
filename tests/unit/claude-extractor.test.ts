import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeExtractor } from '@substack-intelligence/ai';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

// Mock Redis
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn()
    }))
  }
}));

// Mock rate limiting
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn(() => ({
    limit: vi.fn(() => Promise.resolve({ success: true }))
  }))
}));

describe('ClaudeExtractor', () => {
  let extractor: ClaudeExtractor;
  const mockAnthropicResponse = {
    content: [{
      text: JSON.stringify({
        companies: [
          {
            name: 'Glossier',
            description: 'Direct-to-consumer beauty brand',
            context: 'Glossier just raised $80M in Series E funding.',
            sentiment: 'positive',
            confidence: 0.9
          }
        ],
        metadata: {
          processingTime: 1500,
          tokenCount: 250,
          modelVersion: 'claude-3-opus-20240229'
        }
      })
    }],
    usage: {
      input_tokens: 100,
      output_tokens: 150
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.ANTHROPIC_API_KEY = 'test-key';
    
    extractor = new ClaudeExtractor();
  });

  describe('extractCompanies', () => {
    it('should extract companies with correct schema', async () => {
      // Mock the Anthropic client response
      const mockClient = (extractor as any).client;
      mockClient.messages.create.mockResolvedValue(mockAnthropicResponse);

      const content = `
        Glossier just raised $80M in Series E funding.
        The beauty brand is expanding into Europe with new product launches.
      `;

      const result = await extractor.extractCompanies(content, 'Beauty Newsletter');

      expect(result.companies).toHaveLength(1);
      expect(result.companies[0]).toMatchObject({
        name: 'Glossier',
        description: 'Direct-to-consumer beauty brand',
        sentiment: 'positive',
        confidence: 0.9
      });
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.modelVersion).toBe('claude-3-opus-20240229');
      expect(typeof result.metadata.processingTime).toBe('number');
    });

    it('should handle empty content gracefully', async () => {
      const mockClient = (extractor as any).client;
      mockClient.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            companies: [],
            metadata: {
              processingTime: 500,
              tokenCount: 50,
              modelVersion: 'claude-3-opus-20240229'
            }
          })
        }]
      });

      const result = await extractor.extractCompanies('', 'Empty Newsletter');

      expect(result.companies).toHaveLength(0);
      expect(result.metadata).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = (extractor as any).client;
      mockClient.messages.create.mockRejectedValue(new Error('API Error'));

      const result = await extractor.extractCompanies('Some content', 'Test Newsletter');

      expect(result.companies).toHaveLength(0);
      expect(result.metadata.error).toBe('API Error');
    });

    it('should handle malformed JSON response', async () => {
      const mockClient = (extractor as any).client;
      mockClient.messages.create.mockResolvedValue({
        content: [{
          text: 'Invalid JSON response'
        }]
      });

      const result = await extractor.extractCompanies('Some content', 'Test Newsletter');

      expect(result.companies).toHaveLength(0);
      expect(result.metadata.error).toContain('parse');
    });

    it('should validate company confidence scores', async () => {
      const mockClient = (extractor as any).client;
      mockClient.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            companies: [
              {
                name: 'TestCorp',
                description: 'Test company',
                context: 'TestCorp is doing well',
                sentiment: 'positive',
                confidence: 1.5 // Invalid confidence score > 1
              }
            ],
            metadata: {
              processingTime: 1000,
              tokenCount: 100,
              modelVersion: 'claude-3-opus-20240229'
            }
          })
        }]
      });

      // This should throw a validation error due to invalid confidence
      const result = await extractor.extractCompanies('TestCorp is doing well', 'Test Newsletter');
      
      // Since validation fails, it should return empty results
      expect(result.companies).toHaveLength(0);
      expect(result.metadata.error).toBeDefined();
    });
  });

  describe('batchExtract', () => {
    it('should process multiple content pieces', async () => {
      const mockClient = (extractor as any).client;
      mockClient.messages.create.mockResolvedValue(mockAnthropicResponse);

      const contents = [
        { content: 'Glossier raised funding', newsletterName: 'Beauty News', id: '1' },
        { content: 'Warby Parker launched new frames', newsletterName: 'Fashion Weekly', id: '2' }
      ];

      const result = await extractor.batchExtract(contents);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
    });

    it('should handle partial failures in batch processing', async () => {
      const mockClient = (extractor as any).client;
      mockClient.messages.create
        .mockResolvedValueOnce(mockAnthropicResponse)
        .mockRejectedValueOnce(new Error('API Error'));

      const contents = [
        { content: 'Glossier raised funding', newsletterName: 'Beauty News', id: '1' },
        { content: 'Invalid content', newsletterName: 'Test Newsletter', id: '2' }
      ];

      const result = await extractor.batchExtract(contents);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toBe(1);
      expect(result.total).toBe(2);
    });
  });

  describe('system prompt validation', () => {
    it('should have a comprehensive system prompt', () => {
      const prompt = (extractor as any).getSystemPrompt();
      
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('consumer brands');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('sentiment');
      expect(prompt).toContain('private companies');
    });
  });
});