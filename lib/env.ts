/**
 * Environment variable validation
 * Ensures all required environment variables are set
 */

interface EnvConfig {
  required: string[];
  optional: string[];
}

const envConfig: EnvConfig = {
  required: [
    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',

    // Clerk Authentication
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',

    // AI Services
    'ANTHROPIC_API_KEY',

    // Security
    'ENCRYPTION_KEY',
  ],
  optional: [
    // Application
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL',

    // Clerk URLs
    'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',

    // Optional AI
    'OPENAI_API_KEY',

    // Google OAuth
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',

    // Monitoring
    'AXIOM_TOKEN',
    'AXIOM_DATASET',
    'AXIOM_ORG_ID',
    'AXIOM_ENABLED',

    // Email
    'RESEND_API_KEY',
    'REPORT_RECIPIENTS',

    // Rate Limiting
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',

    // Background Jobs
    'INNGEST_EVENT_KEY',
    'INNGEST_SIGNING_KEY',

    // Security
    'WEBHOOK_SECRET',
    'CRON_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',

    // Feature Flags
    'ENABLE_MONITORING',
    'ENABLE_ANALYTICS',
    'ENABLE_ERROR_TRACKING',
    'DEBUG',
  ],
};

/**
 * Validates that all required environment variables are set
 * @throws {Error} if any required variables are missing
 */
export function validateEnv(): void {
  const missingVars: string[] = [];

  for (const varName of envConfig.required) {
    if (!process.env[varName]) {
      // Skip validation for placeholder values in development
      if (process.env.NODE_ENV === 'development' && process.env[varName]?.includes('placeholder')) {
        console.warn(`⚠️  Warning: ${varName} is using a placeholder value`);
        continue;
      }
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    const errorMessage = `
❌ Missing required environment variables:
${missingVars.map(v => `  - ${v}`).join('\n')}

Please ensure all required environment variables are set in your .env.local file or deployment environment.
Refer to .env.example for the full list of variables and their descriptions.
`;

    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    } else {
      console.error(errorMessage);
    }
  }

  // Validate ENCRYPTION_KEY length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters for AES-256 encryption');
  }

  // Log optional missing vars in development
  if (process.env.NODE_ENV === 'development') {
    const missingOptional = envConfig.optional.filter(v => !process.env[v]);
    if (missingOptional.length > 0) {
      console.log(`ℹ️  Optional environment variables not set: ${missingOptional.length} variables`);
    }
  }
}

/**
 * Gets an environment variable value with type safety
 * @param key - The environment variable key
 * @param defaultValue - Optional default value
 * @returns The environment variable value or default
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not set and no default provided`);
  }

  return value || defaultValue || '';
}

/**
 * Gets a boolean environment variable
 * @param key - The environment variable key
 * @param defaultValue - Optional default value
 * @returns The boolean value
 */
export function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];

  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Gets a numeric environment variable
 * @param key - The environment variable key
 * @param defaultValue - Optional default value
 * @returns The numeric value
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];

  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not set and no default provided`);
    }
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
  }

  return parsed;
}

// Run validation on module load in development
if (process.env.NODE_ENV !== 'production') {
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
  }
}