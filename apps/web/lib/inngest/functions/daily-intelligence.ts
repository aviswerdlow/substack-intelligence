import { inngest } from '../client';
import { GmailConnector } from '@substack-intelligence/ingestion';
import { ClaudeExtractor } from '@substack-intelligence/ai';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { normalizeCompanyName, deduplicateCompanies } from '@substack-intelligence/shared';

export const dailyIntelligencePipeline = inngest.createFunction(
  {
    id: 'daily-intelligence-pipeline',
    name: 'Daily Intelligence Pipeline',
    retries: 3,
  },
  { cron: '0 6 * * *' }, // 6 AM daily
  async ({ event, step }) => {
    const startTime = Date.now();
    
    // Step 1: Fetch emails from Gmail
    const emails = await step.run('fetch-emails', async () => {
      console.log('Starting email fetch from Gmail...');
      const connector = new GmailConnector();
      const results = await connector.fetchDailySubstacks();
      console.log(`Fetched ${results.length} emails`);
      return results;
    });

    if (emails.length === 0) {
      console.log('No emails to process, skipping pipeline');
      return { 
        success: true, 
        message: 'No emails to process',
        processed: 0,
        companies: 0,
        processingTime: Date.now() - startTime
      };
    }

    // Step 2: Extract companies using Claude (parallel processing)
    const extractions = await step.run('extract-companies', async () => {
      console.log(`Starting company extraction for ${emails.length} emails...`);
      const extractor = new ClaudeExtractor();
      
      const results = await Promise.allSettled(
        emails.map(async (email) => {
          try {
            const extraction = await extractor.extractCompanies(email.text, email.newsletterName);
            return {
              emailId: email.id,
              newsletterName: email.newsletterName,
              ...extraction
            };
          } catch (error) {
            console.error(`Extraction failed for email ${email.id}:`, error);
            return {
              emailId: email.id,
              newsletterName: email.newsletterName,
              companies: [],
              metadata: {
                processingTime: 0,
                tokenCount: 0,
                modelVersion: 'claude-3-opus-20240229',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            };
          }
        })
      );

      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const totalCompanies = successful.reduce((sum, result) => sum + result.companies.length, 0);
      console.log(`Extracted ${totalCompanies} company mentions from ${successful.length} emails`);

      return successful;
    });

    // Step 3: Store companies and mentions in database
    const storedData = await step.run('store-companies', async () => {
      console.log('Storing companies and mentions in database...');
      const supabase = createServiceRoleClient();
      
      // Collect all unique companies across all extractions
      const allCompanies: Array<{
        name: string;
        description: string | null;
        context: string;
        sentiment: string;
        confidence: number;
        emailId: string;
        newsletterName: string;
      }> = [];

      extractions.forEach(extraction => {
        extraction.companies.forEach((company: any) => {
          allCompanies.push({
            name: company.name,
            description: company.description,
            context: company.context,
            sentiment: company.sentiment,
            confidence: company.confidence,
            emailId: extraction.emailId,
            newsletterName: extraction.newsletterName
          });
        });
      });

      if (allCompanies.length === 0) {
        console.log('No companies to store');
        return { companiesStored: 0, mentionsStored: 0 };
      }

      // Deduplicate companies by normalized name
      const uniqueCompanies = deduplicateCompanies(allCompanies);
      console.log(`Deduplicated to ${uniqueCompanies.length} unique companies`);

      const companiesStored: string[] = [];
      const mentionsToStore: Array<{
        company_id: string;
        email_id: string;
        context: string;
        sentiment: string;
        confidence: number;
      }> = [];

      // Process each unique company
      for (const company of uniqueCompanies) {
        try {
          const normalizedName = normalizeCompanyName(company.name);
          
          // Upsert company record
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .upsert({
              name: company.name,
              normalized_name: normalizedName,
              description: company.description,
              enrichment_status: 'pending'
            }, {
              onConflict: 'normalized_name',
              ignoreDuplicates: false
            })
            .select('id')
            .single();

          if (companyError) {
            console.error(`Failed to store company ${company.name}:`, companyError);
            continue;
          }

          companiesStored.push(companyData.id);

          // Prepare mention record
          const { data: emailData } = await supabase
            .from('emails')
            .select('id')
            .eq('message_id', company.emailId)
            .single();

          if (emailData) {
            mentionsToStore.push({
              company_id: companyData.id,
              email_id: emailData.id,
              context: company.context,
              sentiment: company.sentiment,
              confidence: company.confidence
            });
          }

        } catch (error) {
          console.error(`Error processing company ${company.name}:`, error);
        }
      }

      // Bulk insert mentions
      let mentionsStored = 0;
      if (mentionsToStore.length > 0) {
        const { data: mentionData, error: mentionError } = await supabase
          .from('company_mentions')
          .upsert(mentionsToStore, {
            onConflict: 'company_id,email_id',
            ignoreDuplicates: true
          })
          .select('id');

        if (mentionError) {
          console.error('Failed to store mentions:', mentionError);
        } else {
          mentionsStored = mentionData?.length || 0;
        }
      }

      console.log(`Stored ${companiesStored.length} companies and ${mentionsStored} mentions`);
      
      return {
        companiesStored: companiesStored.length,
        mentionsStored
      };
    });

    // Step 4: Update processing status
    await step.run('update-status', async () => {
      console.log('Updating email processing status...');
      const supabase = createServiceRoleClient();
      
      // Mark all processed emails as completed
      const emailIds = emails.map(email => email.messageId);
      
      const { error } = await supabase
        .from('emails')
        .update({ 
          processing_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .in('message_id', emailIds);
        
      if (error) {
        console.error('Failed to update email status:', error);
      } else {
        console.log(`Updated status for ${emailIds.length} emails`);
      }
    });

    const totalProcessingTime = Date.now() - startTime;
    console.log(`Daily intelligence pipeline completed in ${totalProcessingTime}ms`);

    return {
      success: true,
      processed: emails.length,
      companies: storedData.companiesStored,
      mentions: storedData.mentionsStored,
      processingTime: totalProcessingTime,
      timestamp: new Date().toISOString()
    };
  }
);

// Manual trigger function for testing
export const manualIntelligenceTrigger = inngest.createFunction(
  {
    id: 'manual-intelligence-trigger',
    name: 'Manual Intelligence Trigger',
  },
  { event: 'intelligence/manual-trigger' },
  async ({ event, step }) => {
    // Run the same pipeline but triggered manually
    return await dailyIntelligencePipeline.handler({
      event: { name: 'intelligence/daily', data: {} },
      step,
      runId: `manual-${Date.now()}`,
      attempt: 0
    } as any);
  }
);