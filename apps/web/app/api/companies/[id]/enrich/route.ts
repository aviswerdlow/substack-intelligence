import { NextRequest, NextResponse } from 'next/server';
import { withSecureRoute } from '@/lib/security/middleware';
import { Permission } from '@/lib/security/auth';
import { CompanyEnrichmentService } from '@substack-intelligence/enrichment';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { z } from 'zod';

const EnrichRequestSchema = z.object({
  force: z.boolean().optional().default(false),
  fields: z.array(z.enum(['website', 'social', 'industry', 'metrics', 'tech'])).optional()
});

export const POST = withSecureRoute(
  async (request: NextRequest, context) => {
    // Require company write permissions for enrichment
    if (!context || !context.permissions.includes(Permission.WRITE_COMPANIES)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Extract company ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const companyId = pathParts[pathParts.indexOf('companies') + 1];

      if (!companyId) {
        return new NextResponse(
          JSON.stringify({ error: 'Company ID required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Parse request body
      const body = await request.json().catch(() => ({}));
      const { force, fields } = EnrichRequestSchema.parse(body);

      // Log enrichment request
      await axiomLogger.log('company-enrichment', 'enrichment_requested', {
        companyId,
        userId: context.userId,
        organizationId: context.organizationId,
        force,
        fields,
        timestamp: new Date().toISOString()
      });

      // Initialize enrichment service
      const enrichmentService = new CompanyEnrichmentService();

      // Check if company needs enrichment (unless forced)
      if (!force) {
        const needsEnrichment = await checkEnrichmentNeeded(companyId);
        if (!needsEnrichment) {
          return NextResponse.json({
            success: true,
            message: 'Company enrichment is up to date',
            enriched: false,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Perform enrichment
      const enrichmentData = await enrichmentService.enrichCompany(companyId);

      // Log successful enrichment
      await axiomLogger.logBusinessMetric('company_enriched', 1, {
        companyId,
        confidence: enrichmentData.confidence,
        websiteValid: enrichmentData.validation.websiteValid,
        fieldsEnriched: Object.keys(enrichmentData).filter(key => 
          enrichmentData[key] !== undefined && enrichmentData[key] !== null
        ),
        userId: context.userId
      });

      return NextResponse.json({
        success: true,
        message: 'Company enrichment completed',
        enriched: true,
        data: enrichmentData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Company enrichment failed:', error);

      await axiomLogger.logError(error as Error, {
        operation: 'company_enrichment_api',
        userId: context?.userId,
        organizationId: context?.organizationId
      });

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Company enrichment failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
  {
    requireAuth: true,
    sensitiveEndpoint: false,
    allowedMethods: ['POST'],
    rateLimitEndpoint: 'api/companies/enrich'
  }
);

async function checkEnrichmentNeeded(companyId: string): Promise<boolean> {
  try {
    // In a real implementation, this would check the last_enriched_at timestamp
    // and other factors to determine if enrichment is needed
    
    // For now, assume enrichment is needed if it hasn't been done in the last 7 days
    const { createServiceRoleClient } = await import('@substack-intelligence/database');
    const supabase = createServiceRoleClient();
    
    const { data: company, error } = await supabase
      .from('companies')
      .select('last_enriched_at, enrichment_confidence')
      .eq('id', companyId)
      .single();

    if (error || !company) {
      return true; // Enrich if company not found or error
    }

    // Check if last enrichment was more than 7 days ago
    if (!company.last_enriched_at) {
      return true;
    }

    const lastEnriched = new Date(company.last_enriched_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (lastEnriched < sevenDaysAgo) {
      return true;
    }

    // Check if confidence is low (less than 50)
    if (company.enrichment_confidence < 50) {
      return true;
    }

    return false;

  } catch (error) {
    console.error('Error checking enrichment status:', error);
    return true; // Default to enrichment needed on error
  }
}