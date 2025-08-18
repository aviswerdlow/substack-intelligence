import { inngest } from '../client';
import { EmbeddingService } from '@substack-intelligence/ai';
import { createServiceRoleClient } from '@substack-intelligence/database';

export const processEmbeddingQueue = inngest.createFunction(
  {
    id: 'process-embedding-queue',
    name: 'Process Company Embedding Queue',
    retries: 2,
  },
  { cron: '*/10 * * * *' }, // Every 10 minutes
  async ({ event, step }) => {
    const startTime = Date.now();
    
    // Step 1: Get companies that need embeddings
    const batch = await step.run('get-embedding-batch', async () => {
      console.log('Fetching companies needing embeddings...');
      const supabase = createServiceRoleClient();
      
      const { data, error } = await supabase
        .rpc('get_next_embedding_batch', { batch_size: 5 }); // Process 5 at a time
        
      if (error) {
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} companies needing embeddings`);
      return data || [];
    });

    if (batch.length === 0) {
      console.log('No companies need embeddings at this time');
      return {
        success: true,
        message: 'No companies in queue',
        processed: 0,
        processingTime: Date.now() - startTime
      };
    }

    // Step 2: Process embeddings for each company
    const results = await step.run('generate-embeddings', async () => {
      console.log(`Processing embeddings for ${batch.length} companies...`);
      const embeddingService = new EmbeddingService();
      const supabase = createServiceRoleClient();
      
      const successes: string[] = [];
      const failures: Array<{ id: string; error: string }> = [];
      
      for (const company of batch) {
        try {
          // Update status to processing
          await supabase
            .rpc('update_embedding_queue_status', {
              company_id: company.company_id,
              new_status: 'processing'
            });
          
          // Generate embedding
          const embedding = await embeddingService.generateCompanyEmbedding(company.company_id);
          
          if (embedding) {
            // Mark as completed
            await supabase
              .rpc('update_embedding_queue_status', {
                company_id: company.company_id,
                new_status: 'completed'
              });
            
            successes.push(company.company_id);
            console.log(`✅ Generated embedding for ${company.company_name}`);
          } else {
            throw new Error('Failed to generate embedding');
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Mark as failed
          await supabase
            .rpc('update_embedding_queue_status', {
              company_id: company.company_id,
              new_status: 'failed',
              error_msg: errorMessage
            });
          
          failures.push({
            id: company.company_id,
            error: errorMessage
          });
          
          console.error(`❌ Failed to generate embedding for ${company.company_name}:`, error);
        }
        
        // Rate limiting between companies
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
      
      return { successes, failures };
    });

    const totalProcessingTime = Date.now() - startTime;
    console.log(`Embedding processing completed in ${totalProcessingTime}ms`);

    return {
      success: true,
      processed: batch.length,
      successful: results.successes.length,
      failed: results.failures.length,
      failures: results.failures,
      processingTime: totalProcessingTime,
      timestamp: new Date().toISOString()
    };
  }
);

// Manual trigger for processing embeddings
export const manualEmbeddingProcess = inngest.createFunction(
  {
    id: 'manual-embedding-process',
    name: 'Manual Embedding Processing Trigger',
  },
  { event: 'embeddings/manual-process' },
  async ({ event, step }) => {
    const companyIds = event.data?.companyIds as string[] | undefined;
    
    if (companyIds && companyIds.length > 0) {
      // Process specific companies
      const results = await step.run('process-specific-companies', async () => {
        console.log(`Processing embeddings for ${companyIds.length} specific companies...`);
        const embeddingService = new EmbeddingService();
        
        return await embeddingService.batchGenerateEmbeddings(companyIds, {
          concurrency: 3
        });
      });
      
      return {
        success: true,
        processed: companyIds.length,
        successful: results.success.length,
        failed: results.failed.length,
        results
      };
    } else {
      // Process queue normally
      return await processEmbeddingQueue.handler({
        event: { name: 'embeddings/process-queue', data: {} },
        step,
        runId: `manual-${Date.now()}`,
        attempt: 0
      } as any);
    }
  }
);

// Function to backfill embeddings for all existing companies
export const backfillEmbeddings = inngest.createFunction(
  {
    id: 'backfill-company-embeddings',
    name: 'Backfill Company Embeddings',
    retries: 1,
  },
  { event: 'embeddings/backfill' },
  async ({ event, step }) => {
    console.log('Starting company embeddings backfill...');
    
    // Step 1: Get all companies without embeddings
    const companiesNeedingEmbeddings = await step.run('get-companies-without-embeddings', async () => {
      const embeddingService = new EmbeddingService();
      const companies = await embeddingService.getCompaniesNeedingEmbeddings(1000); // Process up to 1000
      console.log(`Found ${companies.length} companies needing embeddings`);
      return companies;
    });
    
    if (companiesNeedingEmbeddings.length === 0) {
      return {
        success: true,
        message: 'All companies already have embeddings',
        processed: 0
      };
    }
    
    // Step 2: Add companies to the embedding queue
    await step.run('queue-companies-for-processing', async () => {
      const supabase = createServiceRoleClient();
      
      // Insert companies into the embedding queue
      const queueEntries = companiesNeedingEmbeddings.map(companyId => ({
        company_id: companyId,
        priority: 3 // Low priority for backfill
      }));
      
      const { error } = await supabase
        .from('embedding_queue')
        .upsert(queueEntries, {
          onConflict: 'company_id',
          ignoreDuplicates: true
        });
      
      if (error) {
        throw error;
      }
      
      console.log(`Queued ${companiesNeedingEmbeddings.length} companies for embedding processing`);
    });
    
    // Step 3: Process in smaller batches
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < companiesNeedingEmbeddings.length; i += batchSize) {
      batches.push(companiesNeedingEmbeddings.slice(i, i + batchSize));
    }
    
    const results = await step.run('process-embedding-batches', async () => {
      const embeddingService = new EmbeddingService();
      const allResults: { success: string[]; failed: string[] } = { success: [], failed: [] };
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} companies)...`);
        
        const batchResults = await embeddingService.batchGenerateEmbeddings(batch, {
          concurrency: 2 // Slower for backfill to avoid rate limits
        });
        
        allResults.success.push(...batchResults.success);
        allResults.failed.push(...batchResults.failed);
        
        // Longer delay between batches for backfill
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
      }
      
      return allResults;
    });
    
    console.log(`Backfill completed: ${results.success.length} successful, ${results.failed.length} failed`);
    
    return {
      success: true,
      totalCompanies: companiesNeedingEmbeddings.length,
      successful: results.success.length,
      failed: results.failed.length,
      batches: batches.length,
      batchSize
    };
  }
);