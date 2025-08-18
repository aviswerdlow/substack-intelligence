import { NextRequest, NextResponse } from 'next/server';
import { withSecureRoute } from '@/lib/security/middleware';
import { Permission } from '@/lib/security/auth';
import { CompanyEnrichmentService } from '@substack-intelligence/enrichment';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { inngest } from '@/lib/inngest/client';
import { z } from 'zod';

const BatchEnrichRequestSchema = z.object({
  companyIds: z.array(z.string().uuid()).min(1).max(50), // Max 50 companies per batch
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  force: z.boolean().optional().default(false)
});

export const POST = withSecureRoute(
  async (request: NextRequest, context) => {
    // Require admin permissions for batch enrichment
    if (!context || !context.permissions.includes(Permission.ADMIN_SYSTEM)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions for batch operations' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body = await request.json();
      const { companyIds, priority, force } = BatchEnrichRequestSchema.parse(body);

      // Log batch enrichment request
      await axiomLogger.log('company-enrichment', 'batch_enrichment_requested', {
        companyCount: companyIds.length,
        userId: context.userId,
        organizationId: context.organizationId,
        priority,
        force,
        timestamp: new Date().toISOString()
      });

      // Validate companies exist and user has access
      const supabase = createServiceRoleClient();
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, website, last_enriched_at, enrichment_confidence')
        .in('id', companyIds);

      if (error) {
        throw new Error(`Failed to fetch companies: ${error.message}`);
      }

      if (!companies || companies.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: 'No valid companies found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Filter companies that need enrichment (unless forced)
      let companiesToEnrich = companies;
      if (!force) {
        companiesToEnrich = companies.filter(company => {
          // Check if enrichment is needed
          if (!company.last_enriched_at) return true;
          
          const lastEnriched = new Date(company.last_enriched_at);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          
          // Enrich if older than 7 days or confidence is low
          return lastEnriched < sevenDaysAgo || (company.enrichment_confidence || 0) < 50;
        });
      }

      if (companiesToEnrich.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All companies are already up to date',
          enriched: 0,
          skipped: companies.length,
          timestamp: new Date().toISOString()
        });
      }

      // For large batches, use background job processing
      if (companiesToEnrich.length > 5) {
        // Queue background job for batch processing
        await inngest.send({
          name: 'companies/batch-enrich',
          data: {
            companyIds: companiesToEnrich.map(c => c.id),
            userId: context.userId,
            organizationId: context.organizationId,
            priority,
            force,
            timestamp: Date.now()
          }
        });

        await axiomLogger.logBusinessMetric('batch_enrichment_queued', companiesToEnrich.length, {
          userId: context.userId,
          priority
        });

        return NextResponse.json({
          success: true,
          message: 'Batch enrichment queued for background processing',
          queued: companiesToEnrich.length,
          skipped: companies.length - companiesToEnrich.length,
          estimatedCompletionTime: new Date(Date.now() + companiesToEnrich.length * 30000).toISOString(), // 30 seconds per company
          timestamp: new Date().toISOString()
        });
      }

      // For small batches, process immediately
      const enrichmentService = new CompanyEnrichmentService();
      const results = await enrichmentService.enrichCompanies(
        companiesToEnrich.map(c => c.id)
      );

      // Log successful batch enrichment
      await axiomLogger.logBusinessMetric('batch_enrichment_completed', results.length, {
        userId: context.userId,
        averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
        validWebsites: results.filter(r => r.validation.websiteValid).length
      });

      return NextResponse.json({
        success: true,
        message: 'Batch enrichment completed',
        enriched: results.length,
        skipped: companies.length - companiesToEnrich.length,
        results: results.map(result => ({
          id: result.id,
          name: result.name,
          confidence: result.confidence,
          websiteValid: result.validation.websiteValid,
          industry: result.industry,
          lastEnriched: result.lastEnriched
        })),
        summary: {
          averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
          validWebsites: results.filter(r => r.validation.websiteValid).length,
          industriesIdentified: results.filter(r => r.industry).length,
          socialProfilesFound: results.filter(r => 
            r.social && (r.social.linkedin || r.social.twitter)
          ).length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Batch company enrichment failed:', error);

      await axiomLogger.logError(error as Error, {
        operation: 'batch_company_enrichment_api',
        userId: context?.userId,
        organizationId: context?.organizationId
      });

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Batch company enrichment failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
  {
    requireAuth: true,
    sensitiveEndpoint: true,
    allowedMethods: ['POST'],
    rateLimitEndpoint: 'api/companies/enrich-batch'
  }
);

// GET endpoint to check batch enrichment status
export const GET = withSecureRoute(
  async (request: NextRequest, context) => {
    if (!context || !context.permissions.includes(Permission.READ_COMPANIES)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

      const supabase = createServiceRoleClient();

      // Get enrichment statistics
      const { data: stats } = await supabase
        .rpc('get_enrichment_stats');

      // Get recent enrichments
      const { data: recent, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          website,
          industry,
          enrichment_confidence,
          last_enriched_at,
          created_at
        `)
        .not('last_enriched_at', 'is', null)
        .order('last_enriched_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: {
          statistics: stats?.[0] || {
            totalCompanies: 0,
            enrichedCompanies: 0,
            averageConfidence: 0,
            enrichmentRate: 0
          },
          recentEnrichments: recent || [],
          pagination: {
            limit,
            offset,
            total: recent?.length || 0
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to get enrichment status:', error);

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Failed to get enrichment status',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
  {
    requireAuth: true,
    sensitiveEndpoint: false,
    allowedMethods: ['GET'],
    rateLimitEndpoint: 'api/companies/enrich-batch'
  }
);