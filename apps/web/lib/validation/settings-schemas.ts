import { z } from 'zod';

// Account settings schema
export const accountSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

// Newsletter source schema
export const newsletterSourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Newsletter name is required'),
  email: z.string().email('Invalid newsletter email'),
  enabled: z.boolean(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'realtime'], {
    errorMap: () => ({ message: 'Invalid frequency' }),
  }),
});

// Newsletters settings schema
export const newslettersSettingsSchema = z.object({
  sources: z.array(newsletterSourceSchema),
  autoSubscribe: z.boolean(),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: 'Invalid digest frequency' }),
  }),
});

// Company tracking schema
export const companyTrackingSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Company name is required'),
  domain: z.string().url('Invalid domain URL').or(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/, 'Invalid domain')),
  keywords: z.array(z.string().min(1, 'Keyword cannot be empty')).min(1, 'At least one keyword is required'),
  enabled: z.boolean(),
});

// Companies settings schema
export const companiesSettingsSchema = z.object({
  tracking: z.array(companyTrackingSchema),
  autoDetect: z.boolean(),
  minimumMentions: z.number()
    .int('Must be a whole number')
    .min(1, 'Minimum mentions must be at least 1')
    .max(100, 'Maximum mentions cannot exceed 100'),
});

// AI settings schema
export const aiSettingsSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'auto'], {
    errorMap: () => ({ message: 'Invalid AI provider' }),
  }),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().optional(), // Deprecated field
  anthropicApiKey: z.string()
    .regex(/^sk-ant-api[0-9]{2}-[a-zA-Z0-9-_]{48,}$/, 'Invalid Anthropic API key format')
    .or(z.string().length(0))
    .optional(),
  openaiApiKey: z.string()
    .regex(/^sk-[a-zA-Z0-9]{48,}$/, 'Invalid OpenAI API key format')
    .or(z.string().length(0))
    .optional(),
  temperature: z.number()
    .min(0, 'Temperature must be between 0 and 1')
    .max(1, 'Temperature must be between 0 and 1'),
  maxTokens: z.number()
    .int('Must be a whole number')
    .min(1, 'Max tokens must be at least 1')
    .max(100000, 'Max tokens cannot exceed 100000'),
  enableEnrichment: z.boolean(),
}).refine(
  (data) => {
    // Ensure at least one API key is provided if enrichment is enabled
    if (data.enableEnrichment) {
      return (data.anthropicApiKey && data.anthropicApiKey.length > 0) ||
             (data.openaiApiKey && data.openaiApiKey.length > 0);
    }
    return true;
  },
  {
    message: 'At least one API key is required when enrichment is enabled',
    path: ['enableEnrichment'],
  }
);

// Email settings schema
export const emailSettingsSchema = z.object({
  provider: z.enum(['gmail', 'outlook', 'none'], {
    errorMap: () => ({ message: 'Invalid email provider' }),
  }),
  connected: z.boolean(),
  syncFrequency: z.enum(['5min', '15min', '30min', '1hour', '6hours', '24hours', 'manual'], {
    errorMap: () => ({ message: 'Invalid sync frequency' }),
  }),
  lastSync: z.string().datetime().nullable().or(z.null()),
  autoProcess: z.boolean(),
  retentionDays: z.number()
    .int('Must be a whole number')
    .min(7, 'Retention must be at least 7 days')
    .max(365, 'Retention cannot exceed 365 days'),
});

// Reports settings schema
export const reportsSettingsSchema = z.object({
  defaultFormat: z.enum(['pdf', 'html', 'markdown', 'json'], {
    errorMap: () => ({ message: 'Invalid report format' }),
  }),
  includeCharts: z.boolean(),
  includeSentiment: z.boolean(),
  autoGenerate: z.object({
    daily: z.boolean(),
    weekly: z.boolean(),
    monthly: z.boolean(),
  }),
  deliveryTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  recipients: z.array(z.string().email('Invalid recipient email')),
});

// Notifications settings schema
export const notificationsSettingsSchema = z.object({
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
      .min(0, 'Threshold must be between 0 and 100')
      .max(100, 'Threshold must be between 0 and 100'),
    mentionVolume: z.number()
      .int('Must be a whole number')
      .min(1, 'Mention volume must be at least 1')
      .max(1000, 'Mention volume cannot exceed 1000'),
    competitorMentions: z.boolean(),
  }),
});

// API key schema
export const apiKeySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'API key name is required').max(50, 'Name too long'),
  key: z.string().min(32, 'Invalid API key'),
  createdAt: z.string().datetime(),
  lastUsed: z.string().datetime().nullable().or(z.null()),
});

// Webhook schema
export const webhookSchema = z.object({
  id: z.string(),
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.enum([
    'company.created',
    'company.updated',
    'mention.created',
    'report.generated',
    'alert.triggered',
  ])).min(1, 'At least one event must be selected'),
  enabled: z.boolean(),
});

// API settings schema
export const apiSettingsSchema = z.object({
  keys: z.array(apiKeySchema).max(10, 'Maximum 10 API keys allowed'),
  webhooks: z.array(webhookSchema).max(20, 'Maximum 20 webhooks allowed'),
});

// General settings schema
export const generalSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system'], {
    errorMap: () => ({ message: 'Invalid theme' }),
  }),
  language: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh'], {
    errorMap: () => ({ message: 'Invalid language' }),
  }),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], {
    errorMap: () => ({ message: 'Invalid date format' }),
  }),
  timeFormat: z.enum(['12h', '24h'], {
    errorMap: () => ({ message: 'Invalid time format' }),
  }),
  weekStartsOn: z.enum(['sunday', 'monday'], {
    errorMap: () => ({ message: 'Invalid week start day' }),
  }),
  defaultView: z.enum(['dashboard', 'emails', 'companies', 'analytics'], {
    errorMap: () => ({ message: 'Invalid default view' }),
  }),
});

// Privacy settings schema
export const privacySettingsSchema = z.object({
  dataCollection: z.object({
    analytics: z.boolean(),
    errorReporting: z.boolean(),
    usageMetrics: z.boolean(),
  }),
  dataRetention: z.object({
    emails: z.number().int().min(7).max(365),
    reports: z.number().int().min(30).max(730),
    logs: z.number().int().min(1).max(90),
  }),
  exportData: z.object({
    includeEmails: z.boolean(),
    includeCompanies: z.boolean(),
    includeReports: z.boolean(),
    format: z.enum(['json', 'csv', 'excel']),
  }),
});

// Complete settings schema
export const settingsSchema = z.object({
  account: accountSettingsSchema,
  newsletters: newslettersSettingsSchema,
  companies: companiesSettingsSchema,
  ai: aiSettingsSchema,
  email: emailSettingsSchema,
  reports: reportsSettingsSchema,
  notifications: notificationsSettingsSchema,
  api: apiSettingsSchema,
  general: generalSettingsSchema.optional(),
  privacy: privacySettingsSchema.optional(),
});

// Partial schemas for individual tab validation
export const settingsTabSchemas = {
  account: accountSettingsSchema,
  newsletters: newslettersSettingsSchema,
  companies: companiesSettingsSchema,
  ai: aiSettingsSchema,
  email: emailSettingsSchema,
  reports: reportsSettingsSchema,
  notifications: notificationsSettingsSchema,
  api: apiSettingsSchema,
  general: generalSettingsSchema,
  privacy: privacySettingsSchema,
} as const;

// Type exports
export type AccountSettings = z.infer<typeof accountSettingsSchema>;
export type NewslettersSettings = z.infer<typeof newslettersSettingsSchema>;
export type CompaniesSettings = z.infer<typeof companiesSettingsSchema>;
export type AISettings = z.infer<typeof aiSettingsSchema>;
export type EmailSettings = z.infer<typeof emailSettingsSchema>;
export type ReportsSettings = z.infer<typeof reportsSettingsSchema>;
export type NotificationsSettings = z.infer<typeof notificationsSettingsSchema>;
export type APISettings = z.infer<typeof apiSettingsSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;
export type Settings = z.infer<typeof settingsSchema>;

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
  path?: (string | number)[];
}

// Helper function to format Zod errors
export function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    path: err.path,
  }));
}

// Helper function to validate a specific settings tab
export function validateSettingsTab<T extends keyof typeof settingsTabSchemas>(
  tab: T,
  data: unknown
): { success: boolean; errors?: ValidationError[]; data?: z.infer<typeof settingsTabSchemas[T]> } {
  const schema = settingsTabSchemas[tab];
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: formatZodErrors(result.error) };
  }
}

// Helper function to validate all settings
export function validateAllSettings(data: unknown): { 
  success: boolean; 
  errors?: Record<string, ValidationError[]>; 
  data?: Settings 
} {
  const result = settingsSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    // Group errors by top-level field
    const errorsByTab: Record<string, ValidationError[]> = {};
    
    result.error.errors.forEach((err) => {
      const tab = err.path[0] as string;
      if (!errorsByTab[tab]) {
        errorsByTab[tab] = [];
      }
      errorsByTab[tab].push({
        field: err.path.join('.'),
        message: err.message,
        path: err.path,
      });
    });
    
    return { success: false, errors: errorsByTab };
  }
}