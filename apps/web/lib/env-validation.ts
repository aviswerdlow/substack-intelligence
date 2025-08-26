/**
 * Environment Variable Validation Utilities
 * 
 * Provides centralized validation and checking for required environment variables
 * with support for different deployment environments
 */

// Check if we're in build time - be more lenient with validation
const isBuildTime = process.env.npm_lifecycle_event === 'build' || 
                    process.env.VERCEL === '1' || 
                    process.env.BUILDING === '1' ||
                    process.env.CI === 'true';

export interface EnvVarStatus {
  name: string;
  required: boolean;
  present: boolean;
  valid: boolean;
  category: 'database' | 'auth' | 'external_api' | 'monitoring' | 'email' | 'cache' | 'security' | 'feature';
  validationError?: string;
}

export interface EnvValidationResult {
  isValid: boolean;
  isDegraded: boolean;
  missingRequired: string[];
  missingOptional: string[];
  invalid: string[];
  status: EnvVarStatus[];
}

// Define environment variable requirements
const ENV_VAR_DEFINITIONS = {
  // Database - Required for core functionality
  database: {
    NEXT_PUBLIC_SUPABASE_URL: {
      required: true,
      validate: (val: string) => val.startsWith('https://') && val.includes('supabase'),
      errorMessage: 'Must be a valid Supabase URL'
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      required: true,
      validate: (val: string) => val.length > 20,
      errorMessage: 'Must be a valid Supabase anonymous key'
    },
    SUPABASE_SERVICE_KEY: {
      required: true,
      alternates: ['SUPABASE_SERVICE_ROLE_KEY'],
      validate: (val: string) => val.length > 20,
      errorMessage: 'Must be a valid Supabase service key'
    }
  },
  
  // Authentication - Required for user management
  auth: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {
      required: true,
      validate: (val: string) => val.startsWith('pk_'),
      errorMessage: 'Must start with pk_'
    },
    CLERK_SECRET_KEY: {
      required: true,
      validate: (val: string) => val.startsWith('sk_'),
      errorMessage: 'Must start with sk_'
    }
  },
  
  // External APIs - Required for AI features
  external_api: {
    ANTHROPIC_API_KEY: {
      required: true,
      validate: (val: string) => val.startsWith('sk-ant-api'),
      errorMessage: 'Must be a valid Anthropic API key'
    },
    OPENAI_API_KEY: {
      required: false,
      validate: (val: string) => val.startsWith('sk-'),
      errorMessage: 'Must start with sk-'
    }
  },
  
  // Monitoring - Optional but recommended
  monitoring: {
    AXIOM_TOKEN: {
      required: false,
      validate: (val: string) => val.startsWith('xaat-') || val.startsWith('xapt-'),
      errorMessage: 'Must be a valid Axiom token'
    },
    AXIOM_DATASET: {
      required: false,
      validate: (val: string) => val.length > 0,
      errorMessage: 'Dataset name cannot be empty'
    }
  },
  
  // Email services - Optional
  email: {
    RESEND_API_KEY: {
      required: false,
      validate: (val: string) => val.startsWith('re_'),
      errorMessage: 'Must start with re_'
    },
    GOOGLE_CLIENT_ID: {
      required: false,
      validate: (val: string) => val.includes('.apps.googleusercontent.com'),
      errorMessage: 'Must be a valid Google OAuth client ID'
    },
    GOOGLE_CLIENT_SECRET: {
      required: false,
      validate: (val: string) => val.length > 10,
      errorMessage: 'Must be a valid client secret'
    }
  },
  
  // Cache and rate limiting - Optional
  cache: {
    UPSTASH_REDIS_REST_URL: {
      required: false,
      validate: (val: string) => val.startsWith('https://') && val.includes('upstash'),
      errorMessage: 'Must be a valid Upstash Redis URL'
    },
    UPSTASH_REDIS_REST_TOKEN: {
      required: false,
      validate: (val: string) => val.length > 20,
      errorMessage: 'Must be a valid Upstash token'
    }
  },
  
  // Security - Required for production
  security: {
    ENCRYPTION_KEY: {
      required: process.env.NODE_ENV === 'production',
      validate: (val: string) => val.length === 32,
      errorMessage: 'Must be exactly 32 characters for AES-256'
    },
    CRON_SECRET: {
      required: false,
      validate: (val: string) => val.length >= 32,
      errorMessage: 'Should be at least 32 characters'
    }
  }
};

/**
 * Validates all environment variables
 */
export function validateEnvironment(): EnvValidationResult {
  // During build time, return a valid result
  if (isBuildTime) {
    console.log('⚠️ Skipping strict environment validation during build time');
    return {
      isValid: true,
      isDegraded: false,
      missingRequired: [],
      missingOptional: [],
      invalid: [],
      status: []
    };
  }
  
  const status: EnvVarStatus[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const invalid: string[] = [];
  
  for (const [category, vars] of Object.entries(ENV_VAR_DEFINITIONS)) {
    for (const [envVar, config] of Object.entries(vars)) {
      const value = process.env[envVar];
      
      // Check alternates if primary is missing
      let actualValue = value;
      if (!value && 'alternates' in config && config.alternates) {
        const alternates = (config as any).alternates as string[];
        for (const alt of alternates) {
          if (process.env[alt]) {
            actualValue = process.env[alt];
            break;
          }
        }
      }
      
      const present = !!actualValue;
      let valid = present;
      let validationError: string | undefined;
      
      // Validate if present
      if (present && config.validate) {
        try {
          valid = config.validate(actualValue!);
          if (!valid) {
            validationError = config.errorMessage;
            invalid.push(envVar);
          }
        } catch (error) {
          valid = false;
          validationError = `Validation error: ${error}`;
          invalid.push(envVar);
        }
      }
      
      // Track missing vars
      if (!present) {
        if (config.required) {
          missingRequired.push(envVar);
        } else {
          missingOptional.push(envVar);
        }
      }
      
      status.push({
        name: envVar,
        required: config.required,
        present,
        valid,
        category: category as any,
        validationError
      });
    }
  }
  
  const isValid = missingRequired.length === 0 && invalid.length === 0;
  const isDegraded = !isValid || missingOptional.length > 0;
  
  return {
    isValid,
    isDegraded,
    missingRequired,
    missingOptional,
    invalid,
    status
  };
}

/**
 * Gets a summary of environment health for health checks
 */
export function getEnvironmentHealth() {
  const validation = validateEnvironment();
  
  if (validation.isValid && !validation.isDegraded) {
    return {
      status: 'healthy' as const,
      message: 'All required environment variables are configured correctly'
    };
  }
  
  if (validation.missingRequired.length > 0 || validation.invalid.length > 0) {
    return {
      status: 'unhealthy' as const,
      message: 'Critical environment variables are missing or invalid',
      issues: {
        missing: validation.missingRequired,
        invalid: validation.invalid
      }
    };
  }
  
  return {
    status: 'degraded' as const,
    message: 'Optional environment variables are missing',
    issues: {
      missingOptional: validation.missingOptional
    }
  };
}

/**
 * Checks if the minimum required environment is configured for local development
 */
export function hasMinimalDevEnvironment(): boolean {
  // For dev, we only need database and basic auth
  const requiredForDev = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    // Service key can be either name
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  ];
  
  return requiredForDev.every(val => !!val);
}

/**
 * Gets environment-specific configuration recommendations
 */
export function getEnvironmentRecommendations() {
  const env = process.env.NODE_ENV || 'development';
  const validation = validateEnvironment();
  const recommendations: string[] = [];
  
  if (env === 'production') {
    // Production must have everything
    if (!process.env.ENCRYPTION_KEY) {
      recommendations.push('Set ENCRYPTION_KEY for secure data encryption');
    }
    if (!process.env.AXIOM_TOKEN) {
      recommendations.push('Configure Axiom for production monitoring');
    }
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      recommendations.push('Set up Redis for rate limiting and caching');
    }
  }
  
  if (env === 'development') {
    // Dev recommendations
    if (!hasMinimalDevEnvironment()) {
      recommendations.push('Configure minimal Supabase environment for local development');
    }
    if (validation.missingOptional.includes('ANTHROPIC_API_KEY')) {
      recommendations.push('Add ANTHROPIC_API_KEY to enable AI features');
    }
  }
  
  if (env === 'test') {
    // Test environment can run with mocks
    recommendations.push('Test environment detected - using mocked services where appropriate');
  }
  
  return recommendations;
}