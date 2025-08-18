import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_PROJECT_ID: z.string().min(1).optional(),
  
  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),
  
  // AI Services
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  
  // Google Gmail API
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REFRESH_TOKEN: z.string().min(1),
  
  // Email Services
  RESEND_API_KEY: z.string().min(1).optional(),
  
  // Redis/Caching
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  
  // Monitoring
  AXIOM_TOKEN: z.string().min(1).optional(),
  AXIOM_ORG_ID: z.string().min(1).optional(),
  
  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
});

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

// Export validated config
export const config = validateEnv();

// App configuration
export const appConfig = {
  name: 'Substack Intelligence',
  description: 'AI-powered venture intelligence platform for consumer VC deal sourcing',
  version: process.env.npm_package_version || '1.0.0',
  
  // Feature flags
  features: {
    realtime: true,
    vectorSearch: !!config.OPENAI_API_KEY,
    monitoring: !!config.AXIOM_TOKEN,
    workflows: !!config.INNGEST_EVENT_KEY,
    emailDelivery: !!config.RESEND_API_KEY,
  },
  
  // Processing limits
  limits: {
    emailsPerBatch: 50,
    extractionConcurrency: 5,
    maxContextLength: 2000,
    confidenceThreshold: 0.6,
    rateLimitPerMinute: 100,
  },
  
  // Cache settings
  cache: {
    companyTTL: 7 * 24 * 60 * 60, // 7 days
    extractionTTL: 24 * 60 * 60,  // 24 hours
    enrichmentTTL: 3 * 24 * 60 * 60, // 3 days
  },
  
  // Newsletter sources (will be configurable later)
  newsletters: [
    'Morning Brew',
    'The Hustle',
    'CB Insights',
    'First Round Review',
    'NFX Newsletter',
    // Add more as needed
  ],
} as const;

// Type export
export type Config = typeof config;
export type AppConfig = typeof appConfig;