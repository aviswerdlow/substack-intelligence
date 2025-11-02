// Environment templates for different deployment scenarios

export interface EnvironmentTemplate {
  name: string;
  description: string;
  variables: Record<string, {
    required: boolean;
    description: string;
    example?: string;
    sensitive: boolean;
    validation?: RegExp;
  }>;
  notes: string[];
}

export const ENVIRONMENT_TEMPLATES: Record<string, EnvironmentTemplate> = {
  development: {
    name: 'Development Environment',
    description: 'Local development setup with minimal external dependencies',
    variables: {
      NODE_ENV: {
        required: true,
        description: 'Application environment',
        example: 'development',
        sensitive: false,
        validation: /^(development|test|production)$/
      },
      NEXT_PUBLIC_APP_URL: {
        required: true,
        description: 'Application URL for local development',
        example: 'http://localhost:3000',
        sensitive: false,
        validation: /^https?:\/\/.+/
      },
      NEXT_PUBLIC_SUPABASE_URL: {
        required: true,
        description: 'Supabase project URL',
        example: 'https://your-project.supabase.co',
        sensitive: false,
        validation: /^https:\/\/.+\.supabase\.co$/
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        required: true,
        description: 'Supabase service role key for server-side operations',
        example: 'eyJ...',
        sensitive: true,
        validation: /^eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/
      },
      NEXTAUTH_SECRET: {
        required: true,
        description: 'NextAuth secret for signing sessions and JWTs',
        example: 'super-secure-development-secret',
        sensitive: true,
        validation: /^.{16,}$/
      },
      NEXTAUTH_URL: {
        required: false,
        description: 'Base URL used by NextAuth callbacks',
        example: 'http://localhost:3000',
        sensitive: false,
        validation: /^https?:\/\/.+/
      },
      ANTHROPIC_API_KEY: {
        required: true,
        description: 'Anthropic Claude API key for AI processing',
        example: 'sk-ant-api03-...',
        sensitive: true,
        validation: /^sk-ant-api03-[A-Za-z0-9\-_]{95}$/
      },
      AXIOM_TOKEN: {
        required: true,
        description: 'Axiom API token for logging and monitoring',
        example: 'xaat-...',
        sensitive: true
      },
      AXIOM_DATASET: {
        required: true,
        description: 'Axiom dataset name for log storage',
        example: 'substack-intelligence-dev',
        sensitive: false
      },
      GOOGLE_CLIENT_ID: {
        required: false,
        description: 'Google OAuth client ID for Gmail integration',
        example: '1234567890-abc123.apps.googleusercontent.com',
        sensitive: false
      },
      GOOGLE_CLIENT_SECRET: {
        required: false,
        description: 'Google OAuth client secret',
        example: 'GOCSPX-...',
        sensitive: true
      },
      GOOGLE_REFRESH_TOKEN: {
        required: false,
        description: 'Google OAuth refresh token',
        example: '1//04...',
        sensitive: true
      },
      DEBUG: {
        required: false,
        description: 'Enable debug logging',
        example: 'true',
        sensitive: false,
        validation: /^(true|false)$/
      }
    },
    notes: [
      'Development environment uses test/development keys from services',
      'Gmail integration is optional for development',
      'Debug mode can be enabled for verbose logging',
      'Local database can be used instead of production Supabase'
    ]
  },

  staging: {
    name: 'Staging Environment',
    description: 'Pre-production environment for testing with production-like setup',
    variables: {
      NODE_ENV: {
        required: true,
        description: 'Application environment',
        example: 'production',
        sensitive: false,
        validation: /^production$/
      },
      VERCEL_ENV: {
        required: true,
        description: 'Vercel environment',
        example: 'preview',
        sensitive: false
      },
      NEXT_PUBLIC_APP_URL: {
        required: true,
        description: 'Staging application URL',
        example: 'https://staging-substack-intelligence.vercel.app',
        sensitive: false,
        validation: /^https:\/\/.+$/
      },
      NEXT_PUBLIC_SUPABASE_URL: {
        required: true,
        description: 'Staging Supabase project URL',
        example: 'https://staging-project.supabase.co',
        sensitive: false,
        validation: /^https:\/\/.+\.supabase\.co$/
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        required: true,
        description: 'Staging Supabase service role key',
        example: 'eyJ...',
        sensitive: true,
        validation: /^eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/
      },
      NEXTAUTH_SECRET: {
        required: true,
        description: 'NextAuth secret used for staging token signing',
        example: 'super-secure-staging-secret',
        sensitive: true,
        validation: /^.{32,}$/
      },
      NEXTAUTH_URL: {
        required: true,
        description: 'Staging base URL for NextAuth callbacks',
        example: 'https://staging-substack-intelligence.vercel.app',
        sensitive: false,
        validation: /^https:\/\/.+$/
      },
      ANTHROPIC_API_KEY: {
        required: true,
        description: 'Anthropic API key (can use production key)',
        example: 'sk-ant-api03-...',
        sensitive: true,
        validation: /^sk-ant-api03-[A-Za-z0-9\-_]{95}$/
      },
      AXIOM_TOKEN: {
        required: true,
        description: 'Axiom API token for staging logs',
        example: 'xaat-...',
        sensitive: true
      },
      AXIOM_DATASET: {
        required: true,
        description: 'Axiom dataset for staging',
        example: 'substack-intelligence-staging',
        sensitive: false
      },
      GOOGLE_CLIENT_ID: {
        required: true,
        description: 'Google OAuth client ID',
        example: '1234567890-abc123.apps.googleusercontent.com',
        sensitive: false
      },
      GOOGLE_CLIENT_SECRET: {
        required: true,
        description: 'Google OAuth client secret',
        example: 'GOCSPX-...',
        sensitive: true
      },
      GOOGLE_REFRESH_TOKEN: {
        required: true,
        description: 'Google OAuth refresh token',
        example: '1//04...',
        sensitive: true
      },
      UPSTASH_REDIS_REST_URL: {
        required: true,
        description: 'Upstash Redis URL for rate limiting',
        example: 'https://staging-redis.upstash.io',
        sensitive: false,
        validation: /^https:\/\/.+$/
      },
      UPSTASH_REDIS_REST_TOKEN: {
        required: true,
        description: 'Upstash Redis token',
        example: 'AX...',
        sensitive: true
      },
      RESEND_API_KEY: {
        required: true,
        description: 'Resend API key for email delivery',
        example: 're_...',
        sensitive: true,
        validation: /^re_[A-Za-z0-9]+$/
      },
      INNGEST_EVENT_KEY: {
        required: false,
        description: 'Inngest event key for background jobs',
        example: 'evt_...',
        sensitive: true
      },
      INNGEST_SIGNING_KEY: {
        required: false,
        description: 'Inngest signing key',
        example: 'signkey_...',
        sensitive: true
      },
      ENCRYPTION_KEY: {
        required: true,
        description: '32-character encryption key for sensitive data',
        example: 'your-32-character-encryption-key!!',
        sensitive: true,
        validation: /^.{32}$/
      },
      CRON_SECRET: {
        required: true,
        description: 'Secret for protecting cron job endpoints',
        example: 'random-secret-for-cron-jobs',
        sensitive: true
      }
    },
    notes: [
      'Staging should mirror production configuration as closely as possible',
      'Use separate Supabase and authentication credentials for staging',
      'Can share Anthropic API key with production (cost consideration)',
      'All integrations should be fully functional',
      'Use staging-specific datasets and Redis instances'
    ]
  },

  production: {
    name: 'Production Environment',
    description: 'Live production environment with all security and monitoring enabled',
    variables: {
      NODE_ENV: {
        required: true,
        description: 'Application environment',
        example: 'production',
        sensitive: false,
        validation: /^production$/
      },
      VERCEL_ENV: {
        required: true,
        description: 'Vercel environment',
        example: 'production',
        sensitive: false
      },
      NEXT_PUBLIC_APP_URL: {
        required: true,
        description: 'Production application URL',
        example: 'https://substack-intelligence.vercel.app',
        sensitive: false,
        validation: /^https:\/\/.+$/
      },
      NEXT_PUBLIC_SUPABASE_URL: {
        required: true,
        description: 'Production Supabase project URL',
        example: 'https://prod-project.supabase.co',
        sensitive: false,
        validation: /^https:\/\/.+\.supabase\.co$/
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        required: true,
        description: 'Production Supabase service role key',
        example: 'eyJ...',
        sensitive: true,
        validation: /^eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/
      },
      NEXTAUTH_SECRET: {
        required: true,
        description: 'NextAuth production secret (32+ random characters)',
        example: 'super-secure-production-secret',
        sensitive: true,
        validation: /^.{32,}$/
      },
      NEXTAUTH_URL: {
        required: true,
        description: 'Production base URL for NextAuth callbacks',
        example: 'https://substack-intelligence.vercel.app',
        sensitive: false,
        validation: /^https:\/\/.+$/
      },
      ANTHROPIC_API_KEY: {
        required: true,
        description: 'Anthropic production API key',
        example: 'sk-ant-api03-...',
        sensitive: true,
        validation: /^sk-ant-api03-[A-Za-z0-9\-_]{95}$/
      },
      AXIOM_TOKEN: {
        required: true,
        description: 'Axiom production API token',
        example: 'xaat-...',
        sensitive: true
      },
      AXIOM_DATASET: {
        required: true,
        description: 'Axiom production dataset',
        example: 'substack-intelligence-prod',
        sensitive: false
      },
      GOOGLE_CLIENT_ID: {
        required: true,
        description: 'Google OAuth production client ID',
        example: '1234567890-abc123.apps.googleusercontent.com',
        sensitive: false
      },
      GOOGLE_CLIENT_SECRET: {
        required: true,
        description: 'Google OAuth production client secret',
        example: 'GOCSPX-...',
        sensitive: true
      },
      GOOGLE_REFRESH_TOKEN: {
        required: true,
        description: 'Google OAuth production refresh token',
        example: '1//04...',
        sensitive: true
      },
      UPSTASH_REDIS_REST_URL: {
        required: true,
        description: 'Upstash Redis production URL',
        example: 'https://prod-redis.upstash.io',
        sensitive: false,
        validation: /^https:\/\/.+$/
      },
      UPSTASH_REDIS_REST_TOKEN: {
        required: true,
        description: 'Upstash Redis production token',
        example: 'AX...',
        sensitive: true
      },
      RESEND_API_KEY: {
        required: true,
        description: 'Resend production API key',
        example: 're_...',
        sensitive: true,
        validation: /^re_[A-Za-z0-9]+$/
      },
      INNGEST_EVENT_KEY: {
        required: true,
        description: 'Inngest production event key',
        example: 'evt_...',
        sensitive: true
      },
      INNGEST_SIGNING_KEY: {
        required: true,
        description: 'Inngest production signing key',
        example: 'signkey_...',
        sensitive: true
      },
      ENCRYPTION_KEY: {
        required: true,
        description: '32-character production encryption key (must be unique)',
        example: 'your-unique-32-char-prod-key-here!',
        sensitive: true,
        validation: /^.{32}$/
      },
      CRON_SECRET: {
        required: true,
        description: 'Production cron job secret (high entropy)',
        example: 'high-entropy-cron-secret-for-production',
        sensitive: true
      },
      WEBHOOK_SECRET: {
        required: false,
        description: 'Webhook verification secret',
        example: 'webhook-secret-key',
        sensitive: true
      },
      MONITORING_API_KEY: {
        required: false,
        description: 'External monitoring service API key',
        example: 'mon_...',
        sensitive: true
      }
    },
    notes: [
      'CRITICAL: All keys must be production/live versions, not test keys',
      'Use strong, unique secrets for all sensitive values',
      'Enable all monitoring and alerting integrations',
      'Ensure proper backup and disaster recovery setup',
      'Regular security audits and key rotation required',
      'All external services should be production-tier plans'
    ]
  }
};

export function generateEnvironmentFile(template: keyof typeof ENVIRONMENT_TEMPLATES): string {
  const config = ENVIRONMENT_TEMPLATES[template];
  if (!config) {
    throw new Error(`Unknown environment template: ${template}`);
  }

  let content = `# ${config.name}\n`;
  content += `# ${config.description}\n`;
  content += `# Generated on: ${new Date().toISOString()}\n\n`;

  // Add notes
  if (config.notes.length > 0) {
    content += '# IMPORTANT NOTES:\n';
    config.notes.forEach(note => {
      content += `# - ${note}\n`;
    });
    content += '\n';
  }

  // Group variables by category
  const categories = {
    'Core Application': ['NODE_ENV', 'VERCEL_ENV', 'NEXT_PUBLIC_APP_URL'],
    'Database': ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    'Authentication': ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'],
    'External APIs': ['ANTHROPIC_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
    'Monitoring': ['AXIOM_TOKEN', 'AXIOM_DATASET'],
    'Infrastructure': ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'RESEND_API_KEY'],
    'Background Jobs': ['INNGEST_EVENT_KEY', 'INNGEST_SIGNING_KEY'],
    'Security': ['ENCRYPTION_KEY', 'CRON_SECRET', 'WEBHOOK_SECRET'],
    'Optional': ['DEBUG', 'MONITORING_API_KEY']
  };

  for (const [categoryName, categoryVars] of Object.entries(categories)) {
    const relevantVars = categoryVars.filter(varName => varName in config.variables);
    if (relevantVars.length === 0) continue;

    content += `# ============================================================================\n`;
    content += `# ${categoryName.toUpperCase()}\n`;
    content += `# ============================================================================\n\n`;

    for (const varName of relevantVars) {
      const variable = config.variables[varName];
      
      content += `# ${variable.description}\n`;
      if (variable.sensitive) {
        content += '# ⚠️  SENSITIVE: Keep this value secure and never commit to version control\n';
      }
      if (variable.validation) {
        content += `# Format validation: ${variable.validation.source}\n`;
      }
      if (!variable.required) {
        content += '# Optional - can be omitted if not needed\n';
      }
      
      const exampleValue = variable.example || (variable.sensitive ? 'your-secret-value-here' : 'your-value-here');
      content += `${varName}=${exampleValue}\n\n`;
    }
  }

  // Add security reminders
  content += `# ============================================================================\n`;
  content += `# SECURITY REMINDERS\n`;
  content += `# ============================================================================\n\n`;
  content += `# 1. Never commit this file to version control\n`;
  content += `# 2. Use strong, unique values for all sensitive variables\n`;
  content += `# 3. Rotate secrets regularly\n`;
  content += `# 4. Use environment-specific values (don't reuse between dev/staging/prod)\n`;
  content += `# 5. Monitor for exposed secrets in logs and error messages\n`;
  content += `# 6. Use Vercel's environment variable dashboard for production\n\n`;

  return content;
}

export function validateEnvironmentTemplate(
  template: keyof typeof ENVIRONMENT_TEMPLATES, 
  environment: Record<string, string>
): {
  valid: boolean;
  missing: string[];
  invalid: Array<{ key: string; issue: string }>;
  warnings: string[];
} {
  const config = ENVIRONMENT_TEMPLATES[template];
  if (!config) {
    throw new Error(`Unknown environment template: ${template}`);
  }

  const missing: string[] = [];
  const invalid: Array<{ key: string; issue: string }> = [];
  const warnings: string[] = [];

  for (const [key, variable] of Object.entries(config.variables)) {
    const value = environment[key];

    // Check required variables
    if (variable.required && (!value || value.trim() === '')) {
      missing.push(key);
      continue;
    }

    // Skip validation for missing optional variables
    if (!value) continue;

    // Validate format if regex provided
    if (variable.validation && !variable.validation.test(value)) {
      invalid.push({
        key,
        issue: `Does not match expected format: ${variable.validation.source}`
      });
    }

    // Check for example/placeholder values in production
    if (template === 'production' && variable.example && value === variable.example) {
      invalid.push({
        key,
        issue: 'Using example value in production environment'
      });
    }

    // Check for test keys in production
    if (template === 'production') {
      if (key === 'NEXTAUTH_SECRET' && value.length < 32) {
        invalid.push({
          key,
          issue: 'NEXTAUTH_SECRET must be at least 32 characters in production'
        });
      }

      if (key === 'NEXTAUTH_URL' && value.includes('localhost')) {
        invalid.push({
          key,
          issue: 'NEXTAUTH_URL should not point to localhost in production'
        });
      }
    }

    // Security warnings
    if (variable.sensitive && value.length < 16) {
      warnings.push(`${key}: Secret appears to be too short for security`);
    }
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    warnings
  };
}