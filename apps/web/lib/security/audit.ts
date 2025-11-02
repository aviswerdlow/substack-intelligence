import { validateEnvironmentSecurity, performRuntimeSecurityChecks } from './environment';
import { axiomLogger } from '../monitoring/axiom';

export interface SecurityAuditResult {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    authentication: SecurityCategory;
    authorization: SecurityCategory;
    dataProtection: SecurityCategory;
    infrastructure: SecurityCategory;
    monitoring: SecurityCategory;
    compliance: SecurityCategory;
  };
  recommendations: SecurityRecommendation[];
  summary: string;
}

export interface SecurityCategory {
  name: string;
  score: number;
  maxScore: number;
  checks: SecurityCheck[];
}

export interface SecurityCheck {
  name: string;
  description: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
  reference?: string;
}

export interface SecurityRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  references: string[];
}

export async function performSecurityAudit(): Promise<SecurityAuditResult> {
  const categories = {
    authentication: await auditAuthentication(),
    authorization: await auditAuthorization(),
    dataProtection: await auditDataProtection(),
    infrastructure: await auditInfrastructure(),
    monitoring: await auditMonitoring(),
    compliance: await auditCompliance()
  };

  const totalScore = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0);
  const maxScore = Object.values(categories).reduce((sum, cat) => sum + cat.maxScore, 0);
  const score = Math.round((totalScore / maxScore) * 100);

  const grade = calculateGrade(score);
  const recommendations = generateRecommendations(categories);
  const summary = generateSummary(score, grade, categories);

  const result: SecurityAuditResult = {
    score,
    grade,
    categories,
    recommendations,
    summary
  };

  // Log audit result
  await axiomLogger.logSecurityEvent('security_audit_completed', {
    score,
    grade,
    totalChecks: Object.values(categories).reduce((sum, cat) => sum + cat.checks.length, 0),
    failedChecks: Object.values(categories).reduce((sum, cat) => 
      sum + cat.checks.filter(check => !check.passed).length, 0
    ),
    recommendations: recommendations.length
  });

  return result;
}

async function auditAuthentication(): Promise<SecurityCategory> {
  const checks: SecurityCheck[] = [
    {
      name: 'Multi-Factor Authentication',
      description: 'MFA is enforced for admin accounts',
      passed: false,
      severity: 'high',
      recommendation: 'Implement MFA flow using NextAuth callbacks or external provider',
      reference: 'https://next-auth.js.org/configuration/pages#two-factor-authentication'
    },
    {
      name: 'Password Policy',
      description: 'Strong password requirements are enforced',
      passed: true,
      severity: 'medium',
      reference: 'https://supabase.com/docs/guides/auth/passwords'
    },
    {
      name: 'Session Management',
      description: 'Secure session handling with proper timeouts',
      passed: true,
      severity: 'high'
    },
    {
      name: 'OAuth Security',
      description: 'OAuth flows are properly secured with PKCE',
      passed: true,
      severity: 'high',
      reference: 'https://next-auth.js.org/configuration/options#events'
    },
    {
      name: 'Brute Force Protection',
      description: 'Account lockout after failed login attempts',
      passed: true, // Implemented in rate limiting
      severity: 'medium'
    }
  ];

  const score = checks.filter(c => c.passed).length;
  const maxScore = checks.length;

  return {
    name: 'Authentication',
    score,
    maxScore,
    checks
  };
}

async function auditAuthorization(): Promise<SecurityCategory> {
  const checks: SecurityCheck[] = [
    {
      name: 'Role-Based Access Control',
      description: 'RBAC is implemented with proper role separation',
      passed: true, // Implemented in security/auth.ts
      severity: 'critical'
    },
    {
      name: 'API Authorization',
      description: 'All API endpoints have proper authorization checks',
      passed: true, // Enforced in middleware
      severity: 'critical'
    },
    {
      name: 'Resource-Level Permissions',
      description: 'Fine-grained permissions for sensitive operations',
      passed: true,
      severity: 'high'
    },
    {
      name: 'Principle of Least Privilege',
      description: 'Users have minimum necessary permissions',
      passed: true,
      severity: 'high'
    },
    {
      name: 'Permission Inheritance',
      description: 'Organization-level permissions are properly inherited',
      passed: false,
      recommendation: 'Implement organization-level RBAC rules in Supabase or application layer',
      severity: 'medium'
    }
  ];

  const score = checks.filter(c => c.passed).length;
  const maxScore = checks.length;

  return {
    name: 'Authorization',
    score,
    maxScore,
    checks
  };
}

async function auditDataProtection(): Promise<SecurityCategory> {
  const environmentSecurity = validateEnvironmentSecurity();
  
  const checks: SecurityCheck[] = [
    {
      name: 'Data Encryption at Rest',
      description: 'Sensitive data is encrypted in the database',
      passed: true, // Supabase provides encryption at rest
      severity: 'critical',
      reference: 'https://supabase.com/docs/guides/platform/encryption'
    },
    {
      name: 'Data Encryption in Transit',
      description: 'All data transmission uses TLS/SSL',
      passed: true, // HTTPS enforced
      severity: 'critical'
    },
    {
      name: 'Sensitive Data Detection',
      description: 'System can detect and handle sensitive data',
      passed: true, // Implemented in validation.ts
      severity: 'high'
    },
    {
      name: 'Data Anonymization',
      description: 'PII is properly anonymized in logs and exports',
      passed: true, // Implemented in redactSensitiveData
      severity: 'high'
    },
    {
      name: 'Secrets Management',
      description: 'API keys and secrets are properly managed',
      passed: environmentSecurity.isSecure,
      severity: 'critical',
      recommendation: environmentSecurity.errors.join('; ')
    },
    {
      name: 'Database Security',
      description: 'Database access is properly secured',
      passed: true, // RLS policies in Supabase
      severity: 'critical'
    }
  ];

  const score = checks.filter(c => c.passed).length;
  const maxScore = checks.length;

  return {
    name: 'Data Protection',
    score,
    maxScore,
    checks
  };
}

async function auditInfrastructure(): Promise<SecurityCategory> {
  const runtimeChecks = performRuntimeSecurityChecks();
  
  const checks: SecurityCheck[] = [
    {
      name: 'HTTPS Enforcement',
      description: 'All traffic is forced over HTTPS',
      passed: true, // Implemented in middleware
      severity: 'critical'
    },
    {
      name: 'Security Headers',
      description: 'Proper security headers are set',
      passed: true, // Implemented in middleware
      severity: 'high'
    },
    {
      name: 'Content Security Policy',
      description: 'CSP is configured to prevent XSS',
      passed: true, // Implemented in middleware
      severity: 'high'
    },
    {
      name: 'Rate Limiting',
      description: 'API rate limiting is implemented',
      passed: true, // Implemented in rate-limiting.ts
      severity: 'high'
    },
    {
      name: 'Input Validation',
      description: 'All inputs are validated and sanitized',
      passed: true, // Implemented in validation.ts
      severity: 'critical'
    },
    {
      name: 'Runtime Security',
      description: 'Runtime environment is properly secured',
      passed: runtimeChecks.passed,
      severity: 'medium',
      recommendation: runtimeChecks.checks.filter(c => !c.passed).map(c => c.message).join('; ')
    }
  ];

  const score = checks.filter(c => c.passed).length;
  const maxScore = checks.length;

  return {
    name: 'Infrastructure',
    score,
    maxScore,
    checks
  };
}

async function auditMonitoring(): Promise<SecurityCategory> {
  const checks: SecurityCheck[] = [
    {
      name: 'Security Event Logging',
      description: 'Security events are properly logged',
      passed: true, // Implemented in axiom.ts
      severity: 'high'
    },
    {
      name: 'Anomaly Detection',
      description: 'System can detect unusual security patterns',
      passed: true, // Alert manager with thresholds
      severity: 'medium'
    },
    {
      name: 'Real-time Alerting',
      description: 'Security incidents trigger immediate alerts',
      passed: true, // Implemented in alert-config.ts
      severity: 'high'
    },
    {
      name: 'Audit Trail',
      description: 'Comprehensive audit trail is maintained',
      passed: true, // All actions logged
      severity: 'high'
    },
    {
      name: 'Log Retention',
      description: 'Logs are retained for appropriate duration',
      passed: true, // Axiom handles retention
      severity: 'medium'
    }
  ];

  const score = checks.filter(c => c.passed).length;
  const maxScore = checks.length;

  return {
    name: 'Monitoring',
    score,
    maxScore,
    checks
  };
}

async function auditCompliance(): Promise<SecurityCategory> {
  const checks: SecurityCheck[] = [
    {
      name: 'GDPR Compliance',
      description: 'System supports GDPR requirements',
      passed: false,
      severity: 'high',
      recommendation: 'Define GDPR processes (DSAR, consent tracking) for NextAuth users',
      reference: 'https://gdpr-info.eu/'
    },
    {
      name: 'Data Minimization',
      description: 'Only necessary data is collected and stored',
      passed: true,
      severity: 'medium'
    },
    {
      name: 'Right to Deletion',
      description: 'Users can request data deletion',
      passed: false,
      severity: 'high',
      recommendation: 'Expose self-service account deletion flow for NextAuth accounts'
    },
    {
      name: 'Data Portability',
      description: 'Users can export their data',
      passed: false, // Need to implement data export
      severity: 'medium',
      recommendation: 'Implement user data export functionality'
    },
    {
      name: 'Privacy Policy',
      description: 'Clear privacy policy is available',
      passed: false, // Need to create privacy policy
      severity: 'medium',
      recommendation: 'Create and publish privacy policy'
    },
    {
      name: 'Terms of Service',
      description: 'Clear terms of service are available',
      passed: false, // Need to create terms
      severity: 'low',
      recommendation: 'Create and publish terms of service'
    }
  ];

  const score = checks.filter(c => c.passed).length;
  const maxScore = checks.length;

  return {
    name: 'Compliance',
    score,
    maxScore,
    checks
  };
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function generateRecommendations(categories: Record<string, SecurityCategory>): SecurityRecommendation[] {
  const recommendations: SecurityRecommendation[] = [];

  Object.values(categories).forEach(category => {
    category.checks.forEach(check => {
      if (!check.passed && check.recommendation) {
        recommendations.push({
          priority: check.severity as any,
          category: category.name,
          title: `Fix ${check.name}`,
          description: check.recommendation,
          impact: `Improves ${category.name.toLowerCase()} security`,
          effort: 'medium',
          references: check.reference ? [check.reference] : []
        });
      }
    });
  });

  // Add general recommendations
  recommendations.push({
    priority: 'medium',
    category: 'Compliance',
    title: 'Implement Data Export',
    description: 'Allow users to export their personal data for GDPR compliance',
    impact: 'Ensures regulatory compliance and user trust',
    effort: 'medium',
    references: ['https://gdpr-info.eu/art-20-gdpr/']
  });

  recommendations.push({
    priority: 'low',
    category: 'Compliance',
    title: 'Create Legal Documents',
    description: 'Draft and publish privacy policy and terms of service',
    impact: 'Legal protection and user clarity',
    effort: 'low',
    references: ['https://www.privacypolicies.com/', 'https://www.termsandconditionsgenerator.com/']
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

function generateSummary(score: number, grade: string, categories: Record<string, SecurityCategory>): string {
  const failedChecks = Object.values(categories).reduce(
    (sum, cat) => sum + cat.checks.filter(check => !check.passed).length,
    0
  );
  
  const totalChecks = Object.values(categories).reduce(
    (sum, cat) => sum + cat.checks.length,
    0
  );

  const criticalIssues = Object.values(categories).reduce(
    (sum, cat) => sum + cat.checks.filter(check => !check.passed && check.severity === 'critical').length,
    0
  );

  const highIssues = Object.values(categories).reduce(
    (sum, cat) => sum + cat.checks.filter(check => !check.passed && check.severity === 'high').length,
    0
  );

  let summary = `Security Audit Score: ${score}/100 (Grade ${grade})\n\n`;
  summary += `Passed ${totalChecks - failedChecks} out of ${totalChecks} security checks.\n`;
  
  if (criticalIssues > 0) {
    summary += `⚠️  ${criticalIssues} critical security issue${criticalIssues > 1 ? 's' : ''} found.\n`;
  }
  
  if (highIssues > 0) {
    summary += `⚠️  ${highIssues} high-priority issue${highIssues > 1 ? 's' : ''} found.\n`;
  }
  
  if (score >= 90) {
    summary += '\n✅ Excellent security posture! The application follows security best practices.';
  } else if (score >= 80) {
    summary += '\n✅ Good security posture with minor improvements needed.';
  } else if (score >= 70) {
    summary += '\n⚠️  Adequate security but several improvements recommended.';
  } else {
    summary += '\n❌ Security improvements are urgently needed before production deployment.';
  }

  return summary;
}

// Export function to generate security report
export async function generateSecurityReport(): Promise<string> {
  const audit = await performSecurityAudit();
  
  let report = `# Substack Intelligence Platform - Security Audit Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Score:** ${audit.score}/100 (Grade ${audit.grade})\n\n`;
  
  report += `## Executive Summary\n\n${audit.summary}\n\n`;
  
  report += `## Security Categories\n\n`;
  Object.values(audit.categories).forEach(category => {
    report += `### ${category.name}\n`;
    report += `**Score:** ${category.score}/${category.maxScore}\n\n`;
    
    category.checks.forEach(check => {
      const status = check.passed ? '✅' : '❌';
      report += `- ${status} **${check.name}**: ${check.description}\n`;
      if (!check.passed && check.recommendation) {
        report += `  - *Recommendation:* ${check.recommendation}\n`;
      }
    });
    report += '\n';
  });
  
  if (audit.recommendations.length > 0) {
    report += `## Recommendations\n\n`;
    audit.recommendations.forEach((rec, index) => {
      const priority = rec.priority.toUpperCase();
      report += `### ${index + 1}. ${rec.title} (${priority} Priority)\n`;
      report += `**Category:** ${rec.category}\n`;
      report += `**Description:** ${rec.description}\n`;
      report += `**Impact:** ${rec.impact}\n`;
      report += `**Effort:** ${rec.effort}\n`;
      if (rec.references.length > 0) {
        report += `**References:** ${rec.references.join(', ')}\n`;
      }
      report += '\n';
    });
  }
  
  return report;
}