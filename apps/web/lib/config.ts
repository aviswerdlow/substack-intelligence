import { z } from 'zod';

// Check if we're in build time - be more lenient with validation
// During Vercel build, VERCEL_ENV is set but we're still building
const isBuildTime = process.env.npm_lifecycle_event === 'build' || 
                    process.env.BUILDING === '1' ||
                    process.env.CI === 'true' ||
                    (process.env.VERCEL === '1' && !process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://localhost'));

// Environment validation schema
const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Supabase - lenient during build
  NEXT_PUBLIC_SUPABASE_URL: isBuildTime 
    ? z.string().url().optional().default('https://placeholder.supabase.co')
    : z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: isBuildTime
    ? z.string().optional().default('placeholder-anon-key')
    : z.string().min(1),
  SUPABASE_SERVICE_KEY: isBuildTime
    ? z.string().optional().default('placeholder-service-key')
    : z.string().min(1),
  NEXT_PUBLIC_SUPABASE_PROJECT_ID: z.string().min(1).optional(),
  
  // Clerk - lenient during build
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: isBuildTime
    ? z.string().optional().default('pk_test_placeholder')
    : z.string().min(1),
  CLERK_SECRET_KEY: isBuildTime
    ? z.string().optional().default('sk_test_placeholder')
    : z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),
  
  // AI Services - lenient during build
  ANTHROPIC_API_KEY: isBuildTime
    ? z.string().optional().default('placeholder-api-key')
    : z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  
  // Google Gmail API - lenient during build
  GOOGLE_CLIENT_ID: isBuildTime
    ? z.string().optional().default('placeholder-client-id')
    : z.string().min(1),
  GOOGLE_CLIENT_SECRET: isBuildTime
    ? z.string().optional().default('placeholder-client-secret')
    : z.string().min(1),
  GOOGLE_REFRESH_TOKEN: isBuildTime
    ? z.string().optional().default('placeholder-refresh-token')
    : z.string().min(1),
  
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
  // During build, skip validation entirely and return placeholder config
  if (isBuildTime) {
    console.warn(`⚠️ Build time detected - using placeholder environment configuration`);
    return {
      NODE_ENV: process.env.NODE_ENV || 'production',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://placeholder.vercel.app',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
      NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_placeholder',
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'placeholder-api-key',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-client-secret',
      GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN || 'placeholder-refresh-token',
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      AXIOM_TOKEN: process.env.AXIOM_TOKEN,
      AXIOM_ORG_ID: process.env.AXIOM_ORG_ID,
      INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
      INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY
    };
  }
  
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