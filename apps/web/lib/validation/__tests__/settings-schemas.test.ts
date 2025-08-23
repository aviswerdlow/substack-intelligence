import { describe, it, expect } from 'vitest';
import {
  accountSettingsSchema,
  newslettersSettingsSchema,
  companiesSettingsSchema,
  aiSettingsSchema,
  emailSettingsSchema,
  reportsSettingsSchema,
  notificationsSettingsSchema,
  apiSettingsSchema,
  validateSettingsTab,
  validateAllSettings,
  formatZodErrors,
} from '../settings-schemas';

describe('Settings Validation Schemas', () => {
  describe('accountSettingsSchema', () => {
    it('should validate valid account settings', () => {
      const valid = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        timezone: 'America/New_York',
      };

      const result = accountSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalid = {
        name: 'John Doe',
        email: 'not-an-email',
        role: 'Admin',
        timezone: 'America/New_York',
      };

      const result = accountSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email address');
      }
    });

    it('should reject empty name', () => {
      const invalid = {
        name: '',
        email: 'john@example.com',
        role: 'Admin',
        timezone: 'America/New_York',
      };

      const result = accountSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name is required');
      }
    });

    it('should reject name that is too long', () => {
      const invalid = {
        name: 'a'.repeat(101),
        email: 'john@example.com',
        role: 'Admin',
        timezone: 'America/New_York',
      };

      const result = accountSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name too long');
      }
    });
  });

  describe('newslettersSettingsSchema', () => {
    it('should validate valid newsletter settings', () => {
      const valid = {
        sources: [
          {
            id: '1',
            name: 'Tech Newsletter',
            email: 'tech@newsletter.com',
            enabled: true,
            frequency: 'daily',
          },
        ],
        autoSubscribe: true,
        digestFrequency: 'weekly',
      };

      const result = newslettersSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid frequency', () => {
      const invalid = {
        sources: [],
        autoSubscribe: true,
        digestFrequency: 'hourly', // Invalid
      };

      const result = newslettersSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid digest frequency');
      }
    });

    it('should reject invalid newsletter source email', () => {
      const invalid = {
        sources: [
          {
            id: '1',
            name: 'Tech Newsletter',
            email: 'not-an-email',
            enabled: true,
            frequency: 'daily',
          },
        ],
        autoSubscribe: true,
        digestFrequency: 'weekly',
      };

      const result = newslettersSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid newsletter email');
      }
    });
  });

  describe('companiesSettingsSchema', () => {
    it('should validate valid company settings', () => {
      const valid = {
        tracking: [
          {
            id: '1',
            name: 'Acme Corp',
            domain: 'https://acme.com',
            keywords: ['acme', 'corporation'],
            enabled: true,
          },
        ],
        autoDetect: true,
        minimumMentions: 5,
      };

      const result = companiesSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept plain domain format', () => {
      const valid = {
        tracking: [
          {
            id: '1',
            name: 'Acme Corp',
            domain: 'acme.com',
            keywords: ['acme'],
            enabled: true,
          },
        ],
        autoDetect: true,
        minimumMentions: 5,
      };

      const result = companiesSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty keywords array', () => {
      const invalid = {
        tracking: [
          {
            id: '1',
            name: 'Acme Corp',
            domain: 'https://acme.com',
            keywords: [],
            enabled: true,
          },
        ],
        autoDetect: true,
        minimumMentions: 5,
      };

      const result = companiesSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('At least one keyword is required');
      }
    });

    it('should reject invalid minimum mentions', () => {
      const invalid = {
        tracking: [],
        autoDetect: true,
        minimumMentions: 0,
      };

      const result = companiesSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Minimum mentions must be at least 1');
      }
    });
  });

  describe('aiSettingsSchema', () => {
    it('should validate valid AI settings', () => {
      const valid = {
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: '',
        anthropicApiKey: 'sk-ant-api03-valid-key-here-1234567890',
        openaiApiKey: '',
        temperature: 0.7,
        maxTokens: 4000,
        enableEnrichment: false,
      };

      const result = aiSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Anthropic API key format', () => {
      const invalid = {
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: '',
        anthropicApiKey: 'invalid-key',
        openaiApiKey: '',
        temperature: 0.7,
        maxTokens: 4000,
        enableEnrichment: false,
      };

      const result = aiSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid Anthropic API key format');
      }
    });

    it('should reject invalid OpenAI API key format', () => {
      const invalid = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '',
        anthropicApiKey: '',
        openaiApiKey: 'invalid-key',
        temperature: 0.7,
        maxTokens: 4000,
        enableEnrichment: false,
      };

      const result = aiSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid OpenAI API key format');
      }
    });

    it('should require API key when enrichment is enabled', () => {
      const invalid = {
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: '',
        anthropicApiKey: '',
        openaiApiKey: '',
        temperature: 0.7,
        maxTokens: 4000,
        enableEnrichment: true,
      };

      const result = aiSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('At least one API key is required when enrichment is enabled');
      }
    });

    it('should reject temperature outside valid range', () => {
      const invalid = {
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: '',
        anthropicApiKey: '',
        openaiApiKey: '',
        temperature: 1.5,
        maxTokens: 4000,
        enableEnrichment: false,
      };

      const result = aiSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Temperature must be between 0 and 1');
      }
    });
  });

  describe('emailSettingsSchema', () => {
    it('should validate valid email settings', () => {
      const valid = {
        provider: 'gmail',
        connected: true,
        syncFrequency: '15min',
        lastSync: '2024-01-01T00:00:00Z',
        autoProcess: true,
        retentionDays: 30,
      };

      const result = emailSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept null lastSync', () => {
      const valid = {
        provider: 'gmail',
        connected: false,
        syncFrequency: 'manual',
        lastSync: null,
        autoProcess: false,
        retentionDays: 30,
      };

      const result = emailSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid sync frequency', () => {
      const invalid = {
        provider: 'gmail',
        connected: true,
        syncFrequency: '2min',
        lastSync: null,
        autoProcess: true,
        retentionDays: 30,
      };

      const result = emailSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid sync frequency');
      }
    });

    it('should reject retention days outside valid range', () => {
      const invalid = {
        provider: 'gmail',
        connected: true,
        syncFrequency: '15min',
        lastSync: null,
        autoProcess: true,
        retentionDays: 400,
      };

      const result = emailSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Retention cannot exceed 365 days');
      }
    });
  });

  describe('reportsSettingsSchema', () => {
    it('should validate valid report settings', () => {
      const valid = {
        defaultFormat: 'pdf',
        includeCharts: true,
        includeSentiment: true,
        autoGenerate: {
          daily: true,
          weekly: false,
          monthly: false,
        },
        deliveryTime: '09:00',
        recipients: ['user@example.com', 'admin@example.com'],
      };

      const result = reportsSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid time format', () => {
      const invalid = {
        defaultFormat: 'pdf',
        includeCharts: true,
        includeSentiment: true,
        autoGenerate: {
          daily: true,
          weekly: false,
          monthly: false,
        },
        deliveryTime: '25:00',
        recipients: [],
      };

      const result = reportsSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid time format (HH:MM)');
      }
    });

    it('should reject invalid recipient emails', () => {
      const invalid = {
        defaultFormat: 'pdf',
        includeCharts: true,
        includeSentiment: true,
        autoGenerate: {
          daily: true,
          weekly: false,
          monthly: false,
        },
        deliveryTime: '09:00',
        recipients: ['not-an-email'],
      };

      const result = reportsSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid recipient email');
      }
    });
  });

  describe('notificationsSettingsSchema', () => {
    it('should validate valid notification settings', () => {
      const valid = {
        email: {
          enabled: true,
          criticalOnly: false,
          dailyDigest: true,
        },
        inApp: {
          enabled: true,
          soundEnabled: false,
        },
        thresholds: {
          negativeSentiment: 70,
          mentionVolume: 100,
          competitorMentions: true,
        },
      };

      const result = notificationsSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject sentiment threshold outside range', () => {
      const invalid = {
        email: {
          enabled: true,
          criticalOnly: false,
          dailyDigest: true,
        },
        inApp: {
          enabled: true,
          soundEnabled: false,
        },
        thresholds: {
          negativeSentiment: 150,
          mentionVolume: 100,
          competitorMentions: true,
        },
      };

      const result = notificationsSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Threshold must be between 0 and 100');
      }
    });
  });

  describe('apiSettingsSchema', () => {
    it('should validate valid API settings', () => {
      const valid = {
        keys: [
          {
            id: '1',
            name: 'Production Key',
            key: 'sk_live_1234567890abcdef1234567890abcdef',
            createdAt: '2024-01-01T00:00:00Z',
            lastUsed: '2024-01-15T00:00:00Z',
          },
        ],
        webhooks: [
          {
            id: '1',
            url: 'https://example.com/webhook',
            events: ['company.created', 'mention.created'],
            enabled: true,
          },
        ],
      };

      const result = apiSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject too many API keys', () => {
      const invalid = {
        keys: Array(11).fill({
          id: '1',
          name: 'Key',
          key: 'sk_live_1234567890abcdef1234567890abcdef',
          createdAt: '2024-01-01T00:00:00Z',
          lastUsed: null,
        }),
        webhooks: [],
      };

      const result = apiSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Maximum 10 API keys allowed');
      }
    });

    it('should reject invalid webhook URL', () => {
      const invalid = {
        keys: [],
        webhooks: [
          {
            id: '1',
            url: 'not-a-url',
            events: ['company.created'],
            enabled: true,
          },
        ],
      };

      const result = apiSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid webhook URL');
      }
    });

    it('should reject webhook with no events', () => {
      const invalid = {
        keys: [],
        webhooks: [
          {
            id: '1',
            url: 'https://example.com/webhook',
            events: [],
            enabled: true,
          },
        ],
      };

      const result = apiSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('At least one event must be selected');
      }
    });
  });

  describe('Helper Functions', () => {
    describe('formatZodErrors', () => {
      it('should format Zod errors correctly', () => {
        const result = accountSettingsSchema.safeParse({
          name: '',
          email: 'invalid',
          role: '',
          timezone: '',
        });

        if (!result.success) {
          const formatted = formatZodErrors(result.error);
          expect(formatted).toHaveLength(4);
          expect(formatted[0]).toHaveProperty('field');
          expect(formatted[0]).toHaveProperty('message');
          expect(formatted[0]).toHaveProperty('path');
        }
      });
    });

    describe('validateSettingsTab', () => {
      it('should validate a specific tab successfully', () => {
        const accountData = {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'Admin',
          timezone: 'America/New_York',
        };

        const result = validateSettingsTab('account', accountData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(accountData);
      });

      it('should return errors for invalid tab data', () => {
        const invalidData = {
          name: '',
          email: 'invalid',
          role: '',
          timezone: '',
        };

        const result = validateSettingsTab('account', invalidData);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });

    describe('validateAllSettings', () => {
      it('should validate complete settings successfully', () => {
        const completeSettings = {
          account: {
            name: 'John Doe',
            email: 'john@example.com',
            role: 'Admin',
            timezone: 'America/New_York',
          },
          newsletters: {
            sources: [],
            autoSubscribe: true,
            digestFrequency: 'weekly',
          },
          companies: {
            tracking: [],
            autoDetect: true,
            minimumMentions: 3,
          },
          ai: {
            provider: 'anthropic',
            model: 'claude-3',
            apiKey: '',
            anthropicApiKey: '',
            openaiApiKey: '',
            temperature: 0.7,
            maxTokens: 4000,
            enableEnrichment: false,
          },
          email: {
            provider: 'gmail',
            connected: false,
            syncFrequency: '15min',
            lastSync: null,
            autoProcess: false,
            retentionDays: 30,
          },
          reports: {
            defaultFormat: 'pdf',
            includeCharts: true,
            includeSentiment: true,
            autoGenerate: {
              daily: false,
              weekly: false,
              monthly: false,
            },
            deliveryTime: '09:00',
            recipients: [],
          },
          notifications: {
            email: {
              enabled: true,
              criticalOnly: false,
              dailyDigest: true,
            },
            inApp: {
              enabled: true,
              soundEnabled: false,
            },
            thresholds: {
              negativeSentiment: 70,
              mentionVolume: 100,
              competitorMentions: false,
            },
          },
          api: {
            keys: [],
            webhooks: [],
          },
        };

        const result = validateAllSettings(completeSettings);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should return grouped errors for invalid settings', () => {
        const invalidSettings = {
          account: {
            name: '',
            email: 'invalid',
            role: '',
            timezone: '',
          },
          newsletters: {
            sources: [],
            autoSubscribe: true,
            digestFrequency: 'invalid',
          },
          companies: {
            tracking: [],
            autoDetect: true,
            minimumMentions: 0,
          },
          ai: {
            provider: 'invalid',
            model: '',
            apiKey: '',
            anthropicApiKey: 'wrong',
            openaiApiKey: 'wrong',
            temperature: 2,
            maxTokens: -1,
            enableEnrichment: true,
          },
          email: {
            provider: 'invalid',
            connected: false,
            syncFrequency: 'invalid',
            lastSync: 'not-a-date',
            autoProcess: false,
            retentionDays: 500,
          },
          reports: {
            defaultFormat: 'invalid',
            includeCharts: true,
            includeSentiment: true,
            autoGenerate: {
              daily: false,
              weekly: false,
              monthly: false,
            },
            deliveryTime: 'invalid',
            recipients: ['not-email'],
          },
          notifications: {
            email: {
              enabled: true,
              criticalOnly: false,
              dailyDigest: true,
            },
            inApp: {
              enabled: true,
              soundEnabled: false,
            },
            thresholds: {
              negativeSentiment: 150,
              mentionVolume: -1,
              competitorMentions: false,
            },
          },
          api: {
            keys: Array(15).fill({
              id: '1',
              name: '',
              key: 'short',
              createdAt: 'invalid',
              lastUsed: 'invalid',
            }),
            webhooks: [
              {
                id: '1',
                url: 'not-url',
                events: [],
                enabled: true,
              },
            ],
          },
        };

        const result = validateAllSettings(invalidSettings);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        
        // Check that errors are grouped by tab
        const errors = result.errors!;
        expect(errors.account).toBeDefined();
        expect(errors.newsletters).toBeDefined();
        expect(errors.companies).toBeDefined();
        expect(errors.ai).toBeDefined();
        expect(errors.email).toBeDefined();
        expect(errors.reports).toBeDefined();
        expect(errors.notifications).toBeDefined();
        expect(errors.api).toBeDefined();
      });
    });
  });
});