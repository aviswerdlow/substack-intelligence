import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeExtractor } from '@substack-intelligence/ai';

// Create mock functions for Anthropic
const mockMessagesCreate = vi.fn();

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
    id: 'msg_test_id',
    type: 'message',
    role: 'assistant',
    model: 'claude-3-5-sonnet-20241022',
    content: [{
      type: 'text',
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
    },
    stop_reason: 'end_turn',
    stop_sequence: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessagesCreate.mockClear();
    
    // Set default mock response
    mockMessagesCreate.mockResolvedValue(mockAnthropicResponse);
    
    // Create mock Anthropic client
    const mockClient = {
      messages: {
        create: mockMessagesCreate
      },
      apiKey: 'test-key',
      baseURL: 'https://api.anthropic.com'
    } as any;
    
    // Use dependency injection to provide mock client
    extractor = new ClaudeExtractor(mockClient);
  });

  describe('extractCompanies', () => {
    it('should extract companies with correct schema', async () => {
      // Ensure mock is set for this test
      mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse);

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
      expect(result.metadata.modelVersion).toBe('claude-3-5-sonnet-20241022');
      expect(typeof result.metadata.processingTime).toBe('number');
    });

    it('should handle empty content gracefully', async () => {
      // Override the default mock for this specific test
      const emptyResponse = {
        id: 'msg_test_empty',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-5-sonnet-20241022',
        content: [{
          type: 'text',
          text: JSON.stringify({
            companies: [],
            metadata: {
              processingTime: 500,
              tokenCount: 50,
              modelVersion: 'claude-3-5-sonnet-20241022'
            }
          })
        }],
        usage: {
          input_tokens: 10,
          output_tokens: 20
        },
        stop_reason: 'end_turn',
        stop_sequence: null
      };
      mockMessagesCreate.mockResolvedValueOnce(emptyResponse);

      const result = await extractor.extractCompanies('', 'Empty Newsletter');

      expect(result.companies).toHaveLength(0);
      expect(result.metadata).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await extractor.extractCompanies('Some content', 'Test Newsletter');

      expect(result.companies).toHaveLength(0);
      expect(result.metadata.error).toBe('API Error');
    });

    it('should handle malformed JSON response', async () => {
      const malformedResponse = {
        id: 'test-message-id',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-5-sonnet-20241022',
        content: [{
          type: 'text',
          text: 'Invalid JSON response'
        }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        },
        stop_reason: 'end_turn',
        stop_sequence: null
      };
      mockMessagesCreate.mockResolvedValueOnce(malformedResponse);

      const result = await extractor.extractCompanies('Some content', 'Test Newsletter');

      expect(result.companies).toHaveLength(0);
      expect(result.metadata.error).toContain('parse');
    });

    it('should validate company confidence scores', async () => {
      const invalidConfidenceResponse = {
        id: 'msg_test_validation',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-5-sonnet-20241022',
        content: [{
          type: 'text',
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
              modelVersion: 'claude-3-5-sonnet-20241022'
            }
          })
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 100
        },
        stop_reason: 'end_turn',
        stop_sequence: null
      };
      mockMessagesCreate.mockResolvedValueOnce(invalidConfidenceResponse);

      // This should throw a validation error due to invalid confidence
      const result = await extractor.extractCompanies('TestCorp is doing well', 'Test Newsletter');
      
      // Since validation fails, it should return empty results
      expect(result.companies).toHaveLength(0);
      expect(result.metadata.error).toBeDefined();
    });
  });

  describe('batchExtract', () => {
    it('should process multiple content pieces', async () => {
      // Ensure mock returns the default response for each call
      mockMessagesCreate.mockResolvedValue(mockAnthropicResponse);

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
      // First call will use default mock (success), second call will be an error
      mockMessagesCreate
        .mockResolvedValueOnce(mockAnthropicResponse)  // First call succeeds
        .mockRejectedValueOnce(new Error('API Error'));  // Second call fails

      const contents = [
        { content: 'Glossier raised funding', newsletterName: 'Beauty News', id: '1' },
        { content: 'Invalid content', newsletterName: 'Test Newsletter', id: '2' }
      ];

      const result = await extractor.batchExtract(contents);

      expect(result.successful).toHaveLength(2);  // Both should succeed since extractCompanies handles errors gracefully
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
      // Check that one has companies and one doesn't
      const withCompanies = result.successful.filter(r => r.companies.length > 0);
      const withoutCompanies = result.successful.filter(r => r.companies.length === 0);
      expect(withCompanies).toHaveLength(1);
      expect(withoutCompanies).toHaveLength(1);
    });
  });

  describe('system prompt validation', () => {
    it('should have a comprehensive system prompt', () => {
      const prompt = (extractor as any).getSystemPrompt();
      
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('Consumer brands');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('sentiment');
      expect(prompt).toContain('company');
    });
  });
});