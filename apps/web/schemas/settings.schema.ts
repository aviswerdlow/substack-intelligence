import { z } from 'zod';

// Custom validators
const emailValidator = z.string().email('Invalid email address');
const urlValidator = z.string().url('Invalid URL');
const timezoneValidator = z.string().regex(
  /^[A-Za-z]+\/[A-Za-z_]+$/,
  'Invalid timezone format (e.g., America/New_York)'
);

const anthropicApiKeyValidator = z.string()
  .min(1, 'API key is required')
  .regex(
    /^sk-ant-api\d{2}-[A-Za-z0-9\-_]{40,}$/,
    'Invalid Anthropic API key format'
  );

const openaiApiKeyValidator = z.string()
  .min(1, 'API key is required')
  .regex(
    /^sk-[A-Za-z0-9]{48}$/,
    'Invalid OpenAI API key format'
  );

// Account settings schema
export const accountSettingsSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: emailValidator,
  role: z.enum(['Admin', 'User', 'Viewer'], {
    errorMap: () => ({ message: 'Invalid role' })
  }),
  timezone: timezoneValidator,
});

// Newsletter source schema
const newsletterSourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Newsletter name is required'),
  email: emailValidator,
  enabled: z.boolean(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'realtime'], {
    errorMap: () => ({ message: 'Invalid frequency' })
  }),
});

// Newsletter settings schema
export const newsletterSettingsSchema = z.object({
  sources: z.array(newsletterSourceSchema)
    .min(0)
    .max(50, 'Maximum 50 newsletter sources allowed'),
  autoSubscribe: z.boolean(),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: 'Invalid digest frequency' })
  }),
});

// Company tracking schema
const companyTrackingSchema = z.object({
  id: z.string(),
  name: z.string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters'),
  domain: z.string()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      'Invalid domain format'
    )
    .optional(),
  keywords: z.array(z.string())
    .min(0)
    .max(20, 'Maximum 20 keywords per company'),
  enabled: z.boolean(),
});

// Companies settings schema
export const companiesSettingsSchema = z.object({
  tracking: z.array(companyTrackingSchema)
    .max(100, 'Maximum 100 companies allowed'),
  autoDetect: z.boolean(),
  minimumMentions: z.number()
    .int('Must be a whole number')
    .min(1, 'Minimum mentions must be at least 1')
    .max(100, 'Maximum mentions cannot exceed 100'),
});

// AI settings schema
export const aiSettingsSchema = z.object({
  provider: z.enum(['anthropic', 'openai'], {
    errorMap: () => ({ message: 'Invalid AI provider' })
  }),
  model: z.string().min(1, 'Model selection is required'),
  apiKey: z.string().optional(), // Legacy field
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  temperature: z.number()
    .min(0, 'Temperature must be between 0 and 1')
    .max(1, 'Temperature must be between 0 and 1')
    .multipleOf(0.1, 'Temperature must be in increments of 0.1'),
  maxTokens: z.number()
    .int('Must be a whole number')
    .min(100, 'Minimum 100 tokens')
    .max(32000, 'Maximum 32000 tokens'),
  enableEnrichment: z.boolean(),
}).refine(
  (data) => {
    // Validate that the appropriate API key is provided based on provider
    if (data.provider === 'anthropic' && !data.anthropicApiKey) {
      return false;
    }
    if (data.provider === 'openai' && !data.openaiApiKey) {
      return false;
    }
    return true;
  },
  {
    message: 'API key is required for the selected provider',
    path: ['apiKey'],
  }
).refine(
  (data) => {
    // Validate API key format based on provider
    if (data.provider === 'anthropic' && data.anthropicApiKey) {
      return anthropicApiKeyValidator.safeParse(data.anthropicApiKey).success;
    }
    if (data.provider === 'openai' && data.openaiApiKey) {
      return openaiApiKeyValidator.safeParse(data.openaiApiKey).success;
    }
    return true;
  },
  {
    message: 'Invalid API key format for the selected provider',
    path: ['apiKey'],
  }
);

// Email settings schema
export const emailSettingsSchema = z.object({
  provider: z.enum(['gmail', 'outlook', 'custom'], {
    errorMap: () => ({ message: 'Invalid email provider' })
  }),
  connected: z.boolean(),
  syncFrequency: z.enum(['5min', '15min', '30min', '1hour', '6hours', '24hours'], {
    errorMap: () => ({ message: 'Invalid sync frequency' })
  }),
  lastSync: z.string().nullable(),
  autoProcess: z.boolean(),
  retentionDays: z.number()
    .int('Must be a whole number')
    .min(7, 'Minimum retention is 7 days')
    .max(365, 'Maximum retention is 365 days'),
});

// Report settings schema
export const reportSettingsSchema = z.object({
  defaultFormat: z.enum(['pdf', 'html', 'csv', 'json'], {
    errorMap: () => ({ message: 'Invalid report format' })
  }),
  includeCharts: z.boolean(),
  includeSentiment: z.boolean(),
  autoGenerate: z.object({
    daily: z.boolean(),
    weekly: z.boolean(),
    monthly: z.boolean(),
  }),
  deliveryTime: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  recipients: z.array(emailValidator)
    .max(20, 'Maximum 20 recipients allowed'),
});

// Notification settings schema
export const notificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean(),
    criticalOnly: z.boolean(),
    dailyDigest: z.boolean(),
  }),
  inApp: z.object({
    enabled: z.boolean(),
    soundEnabled: z.boolean(),
  }),
  thresholds: z.object({
    negativeSentiment: z.number()
      .min(-1, 'Must be between -1 and 0')
      .max(0, 'Must be between -1 and 0'),
    mentionVolume: z.number()
      .int('Must be a whole number')
      .min(1, 'Minimum threshold is 1')
      .max(1000, 'Maximum threshold is 1000'),
    competitorMentions: z.boolean(),
  }),
});

// API key schema
const apiKeySchema = z.object({
  id: z.string(),
  name: z.string()
    .min(1, 'API key name is required')
    .max(50, 'API key name must be less than 50 characters'),
  key: z.string()
    .min(32, 'API key must be at least 32 characters')
    .max(256, 'API key must be less than 256 characters'),
  createdAt: z.string(),
  lastUsed: z.string().nullable(),
});

// Webhook schema
const webhookSchema = z.object({
  id: z.string(),
  url: urlValidator,
  events: z.array(z.enum([
    'company.detected',
    'company.mentioned',
    'sentiment.negative',
    'report.generated',
    'email.processed',
    'alert.triggered',
  ])).min(1, 'At least one event must be selected'),
  enabled: z.boolean(),
});

// API settings schema
export const apiSettingsSchema = z.object({
  keys: z.array(apiKeySchema)
    .max(10, 'Maximum 10 API keys allowed'),
  webhooks: z.array(webhookSchema)
    .max(10, 'Maximum 10 webhooks allowed'),
});

// Privacy settings schema
export const privacySettingsSchema = z.object({
  dataRetention: z.number()
    .int('Must be a whole number')
    .min(30, 'Minimum retention is 30 days')
    .max(730, 'Maximum retention is 730 days (2 years)'),
  shareAnalytics: z.boolean(),
  allowExport: z.boolean(),
});

// Appearance settings schema
export const appearanceSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system'], {
    errorMap: () => ({ message: 'Invalid theme' })
  }),
  accentColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use hex)')
    .or(z.enum(['blue', 'green', 'purple', 'red', 'orange', 'yellow'])),
  fontSize: z.enum(['small', 'medium', 'large'], {
    errorMap: () => ({ message: 'Invalid font size' })
  }),
  compactMode: z.boolean(),
  showTips: z.boolean(),
});

// Complete settings schema
export const settingsSchema = z.object({
  account: accountSettingsSchema,
  newsletters: newsletterSettingsSchema,
  companies: companiesSettingsSchema,
  ai: aiSettingsSchema,
  email: emailSettingsSchema,
  reports: reportSettingsSchema,
  notifications: notificationSettingsSchema,
  api: apiSettingsSchema,
  privacy: privacySettingsSchema,
  appearance: appearanceSettingsSchema,
});

// Export individual validators for reuse
export const validators = {
  email: emailValidator,
  url: urlValidator,
  timezone: timezoneValidator,
  anthropicApiKey: anthropicApiKeyValidator,
  openaiApiKey: openaiApiKeyValidator,
};

// Helper function to get schema for a specific tab
export function getTabSchema(tab: string): z.ZodSchema | undefined {
  const schemas: Record<string, z.ZodSchema> = {
    account: accountSettingsSchema,
    newsletters: newsletterSettingsSchema,
    companies: companiesSettingsSchema,
    ai: aiSettingsSchema,
    email: emailSettingsSchema,
    reports: reportSettingsSchema,
    notifications: notificationSettingsSchema,
    api: apiSettingsSchema,
    privacy: privacySettingsSchema,
    appearance: appearanceSettingsSchema,
  };
  
  return schemas[tab];
}

// Helper function to validate a specific field
export function validateField(
  tab: string,
  field: string,
  value: any
): { isValid: boolean; error?: string } {
  const schema = getTabSchema(tab);
  if (!schema) {
    return { isValid: true };
  }
  
  try {
    // Get the specific field schema
    const fieldPath = field.split('.');
    let fieldSchema: any = schema;
    
    for (const key of fieldPath) {
      if (fieldSchema.shape && fieldSchema.shape[key]) {
        fieldSchema = fieldSchema.shape[key];
      } else {
        return { isValid: true }; // Field not found in schema
      }
    }
    
    fieldSchema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || 'Invalid value',
      };
    }
    return { isValid: false, error: 'Validation error' };
  }
}

// Export type inference
export type Settings = z.infer<typeof settingsSchema>;
export type AccountSettings = z.infer<typeof accountSettingsSchema>;
export type NewsletterSettings = z.infer<typeof newsletterSettingsSchema>;
export type CompaniesSettings = z.infer<typeof companiesSettingsSchema>;
export type AISettings = z.infer<typeof aiSettingsSchema>;
export type EmailSettings = z.infer<typeof emailSettingsSchema>;
export type ReportSettings = z.infer<typeof reportSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type APISettings = z.infer<typeof apiSettingsSchema>;
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;
export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;