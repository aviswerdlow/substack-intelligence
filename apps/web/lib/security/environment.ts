import { z } from 'zod';

// Environment validation schema
const EnvironmentSchema = z.object({
  // Required environment variables
  NODE_ENV: z.enum(['development', 'test', 'production']),
  
  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key required'),
  
  // Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key required'),
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key required'),
  
  // External APIs
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google client ID required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google client secret required'),
  GOOGLE_REFRESH_TOKEN: z.string().min(1, 'Google refresh token required'),
  
  // Monitoring
  AXIOM_TOKEN: z.string().min(1, 'Axiom token required'),
  AXIOM_DATASET: z.string().min(1, 'Axiom dataset required'),
  
  // Rate limiting
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Upstash Redis URL').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'Upstash Redis token required').optional(),
  
  // Email
  RESEND_API_KEY: z.string().min(1, 'Resend API key required').optional(),
  
  // App configuration
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
  
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
    clerkPublishableKey: string;
    clerkSecretKey: string;
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
        clerkPublishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        clerkSecretKey: env.CLERK_SECRET_KEY,
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
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('test')) {
      errors.push('Using test Clerk key in production');
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
    process.env.CLERK_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.ANTHROPIC_API_KEY,
    process.env.AXIOM_TOKEN
  ];
  
  secrets.forEach((secret, index) => {
    const secretNames = ['CLERK_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'AXIOM_TOKEN'];
    if (secret && secret.length < 20) {
      warnings.push(`${secretNames[index]} appears to be too short`);
    }
  });
  
  // Check for default/example values
  const defaultValues = {
    'your-anthropic-key': 'ANTHROPIC_API_KEY',
    'your-clerk-key': 'CLERK_SECRET_KEY',
    'your-supabase-key': 'SUPABASE_SERVICE_ROLE_KEY',
    'localhost:3000': 'NEXT_PUBLIC_APP_URL'
  };
  
  Object.entries(defaultValues).forEach(([defaultVal, envVar]) => {
    if (process.env[envVar]?.includes(defaultVal)) {
      errors.push(`${envVar} contains default/example value`);
    }
  });
  
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

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key

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
    
    // Perform security validation in production
    if (environmentConfig.isProduction) {
      const securityCheck = validateEnvironmentSecurity();
      if (!securityCheck.isSecure) {
        throw new Error(`Production environment security validation failed: ${securityCheck.errors.join(', ')}`);
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