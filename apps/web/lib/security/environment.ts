import { z } from 'zod';

// Check if we're in build time - be more lenient with validation
const isBuildTime = process.env.npm_lifecycle_event === 'build' || process.env.VERCEL === '1' || process.env.BUILDING === '1';

// Environment validation schema
const EnvironmentSchema = z.object({
  // Required environment variables
  NODE_ENV: z.enum(['development', 'test', 'production']),
  
  // Database - optional during build
  NEXT_PUBLIC_SUPABASE_URL: isBuildTime 
    ? z.string().url('Invalid Supabase URL').optional().default('https://placeholder.supabase.co')
    : z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: isBuildTime
    ? z.string().optional().default('placeholder-anon-key')
    : z.string().min(1, 'Supabase anon key required'),
  SUPABASE_SERVICE_ROLE_KEY: isBuildTime
    ? z.string().optional().default('placeholder-service-key')
    : z.string().min(1, 'Supabase service role key required'),
  
  // Authentication - optional during build
  NEXTAUTH_SECRET: isBuildTime
    ? z.string().optional().default('placeholder-nextauth-secret')
    : z.string().min(1, 'NextAuth secret required'),
  NEXTAUTH_URL: z.string().url('Invalid NextAuth URL').optional(),
  
  // External APIs - optional during build
  ANTHROPIC_API_KEY: z.string().optional().default('placeholder-api-key'),
  GOOGLE_CLIENT_ID: z.string().optional().default('placeholder-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().optional().default('placeholder-client-secret'),
  GOOGLE_REFRESH_TOKEN: z.string().optional().default('placeholder-refresh-token'),
  
  // Monitoring - optional during build
  AXIOM_TOKEN: z.string().optional().default('placeholder-axiom-token'),
  AXIOM_DATASET: z.string().optional().default('placeholder-dataset'),
  
  // Rate limiting
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Upstash Redis URL').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'Upstash Redis token required').optional(),
  
  // Email
  RESEND_API_KEY: z.string().min(1, 'Resend API key required').optional(),
  
  // App configuration - optional during build
  NEXT_PUBLIC_APP_URL: isBuildTime
    ? z.string().url('Invalid app URL').optional().default('https://placeholder.vercel.app')
    : z.string().url('Invalid app URL'),
  
  // Security
  ENCRYPTION_KEY: z.string().length(32, 'Encryption key must be 32 characters').optional(),
  
  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1, 'Inngest event key required').optional(),
  INNGEST_SIGNING_KEY: z.string().min(1, 'Inngest signing key required').optional()
});

// Environment configuration
export interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  database: {
    url: string;
    serviceRoleKey: string;
  };
  auth: {
    nextAuthSecret: string;
    nextAuthUrl?: string;
  };
  apis: {
    anthropic: string;
    google: {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    };
  };
  monitoring: {
    axiom: {
      token: string;
      dataset: string;
    };
  };
  security: {
    encryptionKey?: string;
  };
  app: {
    url: string;
  };
  redis?: {
    url: string;
    token: string;
  };
  email?: {
    resendKey: string;
  };
  inngest?: {
    eventKey: string;
    signingKey: string;
  };
}

// Validate and parse environment variables
export function validateEnvironment(): EnvironmentConfig {
  try {
    const env = EnvironmentSchema.parse(process.env);
    
    const config: EnvironmentConfig = {
      isProduction: env.NODE_ENV === 'production',
      isDevelopment: env.NODE_ENV === 'development',
      isTest: env.NODE_ENV === 'test',
      
      database: {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
      
      auth: {
        nextAuthSecret: env.NEXTAUTH_SECRET,
        nextAuthUrl: env.NEXTAUTH_URL,
      },
      
      apis: {
        anthropic: env.ANTHROPIC_API_KEY,
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          refreshToken: env.GOOGLE_REFRESH_TOKEN,
        },
      },
      
      monitoring: {
        axiom: {
          token: env.AXIOM_TOKEN,
          dataset: env.AXIOM_DATASET,
        },
      },
      
      security: {
        encryptionKey: env.ENCRYPTION_KEY,
      },
      
      app: {
        url: env.NEXT_PUBLIC_APP_URL,
      },
    };
    
    // Optional services
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      config.redis = {
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      };
    }
    
    if (env.RESEND_API_KEY) {
      config.email = {
        resendKey: env.RESEND_API_KEY,
      };
    }
    
    if (env.INNGEST_EVENT_KEY && env.INNGEST_SIGNING_KEY) {
      config.inngest = {
        eventKey: env.INNGEST_EVENT_KEY,
        signingKey: env.INNGEST_SIGNING_KEY,
      };
    }
    
    return config;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// Check for sensitive data in environment
export function validateEnvironmentSecurity(): {
  isSecure: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check for development keys in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters in production');
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')) {
      errors.push('Using localhost Supabase URL in production');
    }
    
    if (!process.env.ENCRYPTION_KEY) {
      warnings.push('No encryption key set in production');
    }
  }
  
  // Check for weak secrets
  const secrets = [
    process.env.NEXTAUTH_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.ANTHROPIC_API_KEY,
    process.env.AXIOM_TOKEN
  ];

  secrets.forEach((secret, index) => {
    const secretNames = ['NEXTAUTH_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'AXIOM_TOKEN'];
    if (secret && secret.length < 20) {
      warnings.push(`${secretNames[index]} appears to be too short`);
    }
  });

  // Check for default/example values
  const defaultValues = {
    'your-anthropic-key': 'ANTHROPIC_API_KEY',
    'your-supabase-key': 'SUPABASE_SERVICE_ROLE_KEY',
    'localhost:3000': 'NEXT_PUBLIC_APP_URL'
  };
  
  Object.entries(defaultValues).forEach(([defaultVal, envVar]) => {
    if (process.env[envVar]?.includes(defaultVal)) {
      errors.push(`${envVar} contains default/example value`);
    }
  });

  if (process.env.NEXTAUTH_URL?.includes('localhost')) {
    warnings.push('NEXTAUTH_URL appears to be configured for localhost');
  }

  return {
    isSecure: errors.length === 0,
    warnings,
    errors
  };
}

// Generate secure environment file template
export function generateEnvironmentTemplate(): string {
  return `# Substack Intelligence Platform - Environment Configuration
# Copy this file to .env.local and fill in your actual values

# ============================================================================
# REQUIRED CONFIGURATION
# ============================================================================

# Application Environment
NODE_ENV=development

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ============================================================================
# AUTHENTICATION
# ============================================================================

# NextAuth Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# ============================================================================
# EXTERNAL APIs
# ============================================================================

# Anthropic Claude AI
ANTHROPIC_API_KEY=your-anthropic-api-key

# Google OAuth for Gmail Access
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token

# ============================================================================
# MONITORING & LOGGING
# ============================================================================

# Axiom Logging
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=substack-intelligence

# ============================================================================
# OPTIONAL SERVICES
# ============================================================================

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# Resend Email Service
RESEND_API_KEY=your-resend-api-key

# Inngest Background Jobs
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# ============================================================================
# SECURITY
# ============================================================================

# Encryption Key (32 characters for production)
ENCRYPTION_KEY=your-32-character-encryption-key

# ============================================================================
# DEVELOPMENT ONLY
# ============================================================================

# Set to 'true' to enable debug logging
DEBUG=false

# Disable SSL verification for development (NOT for production)
NODE_TLS_REJECT_UNAUTHORIZED=1
`;
}

// Runtime environment checks
export function performRuntimeSecurityChecks(): {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
} {
  const checks = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  checks.push({
    name: 'Node.js Version',
    passed: majorVersion >= 18,
    message: majorVersion >= 18 ? `Node.js ${nodeVersion} is supported` : `Node.js ${nodeVersion} is outdated, upgrade to 18+`
  });
  
  // Check for required globals
  checks.push({
    name: 'Crypto Available',
    passed: typeof crypto !== 'undefined',
    message: typeof crypto !== 'undefined' ? 'Crypto API is available' : 'Crypto API is not available'
  });
  
  // Check environment isolation
  const isProduction = process.env.NODE_ENV === 'production';
  checks.push({
    name: 'Environment Isolation',
    passed: !isProduction || !process.env.APP_DEBUG_MODE,
    message: !isProduction || !process.env.APP_DEBUG_MODE ? 'Debug mode is properly configured' : 'Debug mode should be disabled in production'
  });
  
  // Check for sensitive env vars in client bundle
  const clientEnvVars = Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'));
  const sensitiveInClient = clientEnvVars.some(key => 
    key.toLowerCase().includes('secret') || 
    key.toLowerCase().includes('private') ||
    key.toLowerCase().includes('token')
  );
  
  checks.push({
    name: 'Client Bundle Security',
    passed: !sensitiveInClient,
    message: !sensitiveInClient ? 'No sensitive data exposed to client' : 'Sensitive data may be exposed in client bundle'
  });
  
  const passed = checks.every(check => check.passed);
  
  return { passed, checks };
}

// Initialize and validate environment on startup
let environmentConfig: EnvironmentConfig | null = null;

export function getEnvironmentConfig(): EnvironmentConfig {
  if (!environmentConfig) {
    environmentConfig = validateEnvironment();
    
    // Perform security validation in production (skip during build)
    if (environmentConfig.isProduction && !process.env.NEXT_PHASE) {
      const securityCheck = validateEnvironmentSecurity();
      if (!securityCheck.isSecure) {
        // During build, just warn instead of throwing
        if (process.env.npm_lifecycle_event === 'build') {
          console.warn(`Production environment security validation failed: ${securityCheck.errors.join(', ')}`);
        } else {
          throw new Error(`Production environment security validation failed: ${securityCheck.errors.join(', ')}`);
        }
      }
      
      if (securityCheck.warnings.length > 0) {
        console.warn('Environment security warnings:', securityCheck.warnings);
      }
    }
    
    // Perform runtime checks
    const runtimeChecks = performRuntimeSecurityChecks();
    if (!runtimeChecks.passed) {
      const failedChecks = runtimeChecks.checks.filter(c => !c.passed);
      console.warn('Runtime security check failures:', failedChecks);
    }
  }
  
  return environmentConfig;
}

// Export for use throughout the application
export const env = getEnvironmentConfig();