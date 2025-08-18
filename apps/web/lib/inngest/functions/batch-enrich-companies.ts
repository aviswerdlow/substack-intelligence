import { inngest } from '../client';
import { CompanyEnrichmentService } from '../../../../services/enrichment/src/company-enrichment';
import { axiomLogger } from '../../monitoring/axiom';
import { alertManager } from '../../monitoring/alert-config';
import { z } from 'zod';

const BatchEnrichDataSchema = z.object({
  companyIds: z.array(z.string()),
  userId: z.string(),
  organizationId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  force: z.boolean().default(false),
  timestamp: z.number()
});

export const batchEnrichCompanies = inngest.createFunction(
  {
    id: 'batch-enrich-companies',
    name: 'Batch Enrich Companies',
    concurrency: {
      limit: 3, // Max 3 concurrent batch enrichment jobs
    },
    retries: 2
  },
  { event: 'companies/batch-enrich' },
  async ({ event, step }) => {
    const startTime = Date.now();
    
    try {
      // Validate event data
      const data = BatchEnrichDataSchema.parse(event.data);
      const { companyIds, userId, organizationId, priority, force } = data;

      await step.run('log-batch-start', async () => {
        await axiomLogger.log('batch-enrichment', 'batch_job_started', {
          jobId: event.id,
          companyCount: companyIds.length,
          userId,
          organizationId,
          priority,
          timestamp: new Date().toISOString()
        });
      });

      // Process companies in chunks based on priority
      const chunkSize = priority === 'high' ? 2 : priority === 'normal' ? 3 : 5;
      const chunks = [];
      
      for (let i = 0; i < companyIds.length; i += chunkSize) {
        chunks.push(companyIds.slice(i, i + chunkSize));
      }

      const allResults = [];
      const enrichmentService = new CompanyEnrichmentService();

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const chunkResults = await step.run(
          `enrich-chunk-${i}`,
          async () => {
            const results = [];
            
            for (const companyId of chunk) {
              try {
                const result = await enrichmentService.enrichCompany(companyId);
                results.push({ companyId, status: 'success', data: result });
                
                // Log individual success
                await axiomLogger.logBusinessMetric('company_enriched_batch', 1, {
                  companyId,
                  confidence: result.confidence,
                  websiteValid: result.validation.websiteValid,
                  jobId: event.id,
                  chunkIndex: i
                });
                
              } catch (error) {
                console.error(`Failed to enrich company ${companyId}:`, error);
                results.push({
                  companyId,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
                
                // Log individual failure
                await axiomLogger.logError(error as Error, {
                  operation: 'batch_company_enrichment',
                  companyId,
                  jobId: event.id,
                  chunkIndex: i
                });
              }
            }
            
            return results;
          }
        );

        allResults.push(...chunkResults);

        // Add delay between chunks to avoid overwhelming external services
        if (i < chunks.length - 1) {
          await step.sleep('chunk-delay', `${priority === 'high' ? 3 : 5}s`);
        }
      }

      // Analyze results and create summary
      const summary = await step.run('create-summary', async () => {
        const successful = allResults.filter(r => r.status === 'success');
        const failed = allResults.filter(r => r.status === 'failed');
        
        const successfulData = successful
          .map(r => r.data)
          .filter(Boolean);

        const summary = {
          total: companyIds.length,
          successful: successful.length,
          failed: failed.length,
          averageConfidence: successfulData.length > 0 
            ? successfulData.reduce((sum, d) => sum + d.confidence, 0) / successfulData.length 
            : 0,
          validWebsites: successfulData.filter(d => d.validation.websiteValid).length,
          industriesIdentified: successfulData.filter(d => d.industry).length,
          socialProfilesFound: successfulData.filter(d => 
            d.social && (d.social.linkedin || d.social.twitter)
          ).length,
          processingTime: Date.now() - startTime,
          failedCompanies: failed.map(f => ({
            companyId: f.companyId,
            error: f.error
          }))
        };

        // Log batch completion
        await axiomLogger.log('batch-enrichment', 'batch_job_completed', {
          jobId: event.id,
          userId,
          organizationId,
          summary,
          timestamp: new Date().toISOString()
        });

        return summary;
      });

      // Check for concerning failure rates and alert
      if (summary.failed > summary.successful) {
        await step.run('alert-high-failure-rate', async () => {
          await alertManager.checkAlert('batch_enrichment_failure_rate', 
            summary.failed / summary.total, {
              jobId: event.id,
              failedCount: summary.failed,
              totalCount: summary.total,
              userId,
              failedCompanies: summary.failedCompanies
            }
          );
        });
      }

      // Store batch job results for later retrieval
      await step.run('store-batch-results', async () => {
        // In a real implementation, store results in database for status checking
        const { createServiceRoleClient } = await import('@substack-intelligence/database');
        const supabase = createServiceRoleClient();
        
        try {
          await supabase.from('batch_jobs').insert({
            id: event.id,
            type: 'company_enrichment',
            status: 'completed',
            user_id: userId,
            organization_id: organizationId,
            input_data: { companyIds, priority, force },
            results: allResults,
            summary,
            created_at: new Date(data.timestamp).toISOString(),
            completed_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('Failed to store batch job results:', error);
          // Don't throw - job still succeeded
        }
      });

      return {
        success: true,
        jobId: event.id,
        summary,
        results: allResults,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Batch enrichment job failed:', error);

      // Log job failure
      await axiomLogger.logError(error as Error, {
        operation: 'batch_enrichment_job',
        jobId: event.id,
        processingTime: Date.now() - startTime
      });

      // Alert on job failure
      await alertManager.checkAlert('batch_job_failures', 1, {
        jobType: 'company_enrichment',
        jobId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }
);

// Function to get batch job status
export const getBatchJobStatus = inngest.createFunction(
  {
    id: 'get-batch-job-status',
    name: 'Get Batch Job Status'
  },
  { event: 'batch-jobs/get-status' },
  async ({ event }) => {
    try {
      const { jobId } = event.data;
      
      const { createServiceRoleClient } = await import('@substack-intelligence/database');
      const supabase = createServiceRoleClient();
      
      const { data: job, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        job: job || null,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get batch job status:', error);
      throw error;
    }
  }
);