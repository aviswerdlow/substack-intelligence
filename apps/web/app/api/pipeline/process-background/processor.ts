import { createServiceRoleClient } from '@substack-intelligence/database';
import { ClaudeExtractor } from '@substack-intelligence/ai';
import { pushPipelineUpdate } from '@/lib/pipeline-updates';
import { createPipelineAlert } from '@/lib/monitoring/pipeline-metrics';

export interface ProcessBackgroundOptions {
  userId: string;
  batchSize?: number;
  maxProcessingTime?: number;
  logPrefix?: string;
}

export interface ProcessBackgroundResult {
  success: boolean;
  processed: number;
  remaining: number;
  companiesExtracted: number;
  failed: number;
  errors?: string[];
}

export async function processBackgroundEmails({
  userId,
  batchSize = 10,
  maxProcessingTime = 50000,
  logPrefix = '[Background]',
}: ProcessBackgroundOptions): Promise<ProcessBackgroundResult> {
  console.log(`${logPrefix} Starting background processor`, {userId, batchSize, maxProcessingTime});
  if (!userId) {
    throw new Error('userId is required');
  }

  const supabase = createServiceRoleClient();
  const startTime = Date.now();
  const normalizedBatchSize = Math.max(1, Math.min(batchSize, 25));

  let extractor: ClaudeExtractor;
  try {
    extractor = new ClaudeExtractor();
  } catch (error) {
    console.error(`${logPrefix} Failed to initialize Claude extractor:`, error);
    throw new Error('AI service unavailable');
  }

  let processedCount = 0;
  let companiesExtracted = 0;
  const errors: string[] = [];
  let totalQueued = 0;
  let failedCount = 0;

  while (Date.now() - startTime < maxProcessingTime) {
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .eq('processing_status', 'pending')
      .order('received_at', { ascending: false })
      .limit(normalizedBatchSize);

    if (fetchError) {
      console.error(`${logPrefix} Failed to fetch pending emails:`, fetchError);
      throw new Error('Failed to fetch pending emails');
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log(`${logPrefix} No more pending emails for user ${userId}, exiting loop.`);
      break;
    }

    totalQueued += pendingEmails.length;
    console.log(`${logPrefix} Processing ${pendingEmails.length} emails for user ${userId}`);

    for (const email of pendingEmails) {
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs > maxProcessingTime) {
        console.log(`${logPrefix} Timeout after ${elapsedMs}ms, processed ${processedCount} emails so far`);
        break;
      }

      try {
        const processingIso = new Date().toISOString();

        await supabase
          .from('emails')
          .update({
            processing_status: 'processing',
            extraction_status: 'processing',
            extraction_started_at: processingIso,
            processed_at: processingIso,
            error_message: null,
            extraction_error: null
          })
          .eq('id', email.id);

        const content = email.clean_text || email.raw_html || '';
        if (!content || content.trim().length < 20) {
          const completionIso = new Date().toISOString();
          await supabase
            .from('emails')
            .update({
              processing_status: 'completed',
              extraction_status: 'completed',
              extraction_completed_at: completionIso,
              processed_at: completionIso,
              companies_extracted: 0,
              error_message: null,
              extraction_error: null
            })
            .eq('id', email.id);

          processedCount++;
          continue;
        }

        console.log(`${logPrefix} [EXTRACTION:START] Starting extraction for email ${email.id}`, {
          emailId: email.id,
          newsletter: email.newsletter_name,
          contentLength: content.length,
          contentPreview: content.substring(0, 100)
        });

        const extractionResult = await extractor.extractCompanies(
          content,
          email.newsletter_name || 'Unknown Newsletter'
        );

        console.log(`${logPrefix} [EXTRACTION:RESULT] Raw extraction result:`, {
          emailId: email.id,
          hasResult: !!extractionResult,
          companiesArray: extractionResult?.companies,
          companiesCount: extractionResult?.companies?.length || 0,
          metadata: extractionResult?.metadata,
          hasError: !!extractionResult?.metadata?.error
        });

        if (extractionResult?.metadata?.error) {
          console.error(`${logPrefix} [EXTRACTION:ERROR] Extraction returned error in metadata:`, {
            emailId: email.id,
            error: extractionResult.metadata.error
          });
          throw new Error(extractionResult.metadata.error);
        }

        console.log(`${logPrefix} [EXTRACTION:SUCCESS] Extracted ${extractionResult.companies.length} companies from email ${email.id}`, {
          emailId: email.id,
          companies: extractionResult.companies.map(c => ({ name: c.name, description: c.description?.substring(0, 50) }))
        });

        let companiesInEmail = 0;

        for (const company of extractionResult.companies) {
          console.log(`${logPrefix} [DB:CHECK] Checking if company exists:`, {
            companyName: company.name,
            userId: userId,
            emailId: email.id
          });

          // Check for existing company (case-insensitive)
          const { data: existingCompany, error: checkError } = await supabase
            .from('companies')
            .select('id, mention_count, name')
            .eq('user_id', userId)
            .ilike('name', company.name)  // Case-insensitive comparison
            .single();

          if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error(`${logPrefix} [DB:ERROR] Error checking for existing company:`, {
              companyName: company.name,
              error: checkError,
              errorCode: checkError.code,
              errorMessage: checkError.message
            });
            // Skip this company if we can't check for existing
            continue;
          }

          let companySuccessfullySaved = false;

          if (existingCompany) {
            console.log(`${logPrefix} [DB:UPDATE] Updating existing company:`, {
              companyId: existingCompany.id,
              companyName: company.name,
              currentMentions: existingCompany.mention_count,
              newMentions: (existingCompany.mention_count || 0) + 1
            });

            const { error: updateError } = await supabase
              .from('companies')
              .update({
                mention_count: (existingCompany.mention_count || 0) + 1,
                last_updated_at: new Date().toISOString()
              })
              .eq('id', existingCompany.id);

            if (updateError) {
              console.error(`${logPrefix} [DB:ERROR] Failed to update company:`, {
                companyId: existingCompany.id,
                error: updateError,
                errorCode: updateError.code,
                errorMessage: updateError.message
              });
            } else {
              companySuccessfullySaved = true;
              console.log(`${logPrefix} [DB:SUCCESS] Successfully updated company mention count`);
            }

            const { error: mentionError } = await supabase
              .from('company_mentions')
              .insert({
                user_id: userId,
                company_id: existingCompany.id,
                email_id: email.id,
                context: company.context || 'Mentioned in newsletter',
                sentiment: 'neutral',
                confidence: company.confidence || 0.8,
                extracted_at: new Date().toISOString()
              });

            if (mentionError) {
              console.error(`${logPrefix} [DB:ERROR] Failed to insert company mention:`, {
                companyId: existingCompany.id,
                error: mentionError
              });
            }
          } else {
            console.log(`${logPrefix} [DB:INSERT] Creating new company:`, {
              companyName: company.name,
              description: company.description?.substring(0, 100),
              industry: company.industry,
              userId: userId
            });

            const normalizedName = company.name.toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '') + '-' + Date.now();

            const { data: newCompany, error: insertError } = await supabase
              .from('companies')
              .insert({
                user_id: userId,
                name: company.name,
                normalized_name: normalizedName,
                description: company.description,
                industry: Array.isArray(company.industry) ? company.industry : company.industry ? [company.industry] : [],
                mention_count: 1,
                first_seen_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (insertError) {
              console.error(`${logPrefix} [DB:ERROR] Failed to insert new company:`, {
                companyName: company.name,
                error: insertError,
                errorCode: insertError.code,
                errorMessage: insertError.message,
                errorDetails: insertError.details,
                normalizedName: normalizedName
              });
              // Try to understand if it's a duplicate or other error
              if (insertError.code === '23505') { // Unique violation
                console.error(`${logPrefix} [DB:ERROR] Company might already exist with different casing or similar name`);
              }
            } else if (newCompany) {
              companySuccessfullySaved = true;
              console.log(`${logPrefix} [DB:SUCCESS] Successfully created new company:`, {
                companyId: newCompany.id,
                companyName: newCompany.name
              });
            }

            if (newCompany) {
              const { error: mentionError } = await supabase
                .from('company_mentions')
                .insert({
                  user_id: userId,
                  company_id: newCompany.id,
                  email_id: email.id,
                  context: company.context || 'Mentioned in newsletter',
                  sentiment: 'neutral',
                  confidence: company.confidence || 0.8,
                  extracted_at: new Date().toISOString()
                });

              if (mentionError) {
                console.error(`${logPrefix} [DB:ERROR] Failed to insert mention for new company:`, {
                  companyId: newCompany.id,
                  error: mentionError
                });
              }
            }
          }

          // Only count as extracted if successfully saved to database
          if (companySuccessfullySaved) {
            companiesInEmail++;
            companiesExtracted++;
            console.log(`${logPrefix} [DB:SUCCESS] Company saved successfully, total extracted: ${companiesExtracted}`);
          } else {
            console.error(`${logPrefix} [DB:WARNING] Company not saved to database:`, {
              companyName: company.name,
              reason: 'Database operation failed'
            });
          }
        }

        console.log(`${logPrefix} [EMAIL:COMPLETE] Finished processing email:`, {
          emailId: email.id,
          newsletter: email.newsletter_name,
          companiesFoundInEmail: companiesInEmail,
          totalCompaniesExtracted: companiesExtracted,
          totalEmailsProcessed: processedCount + 1
        });

        const completionIso = new Date().toISOString();

        const { error: updateEmailError } = await supabase
          .from('emails')
          .update({
            processing_status: 'completed',
            extraction_status: 'completed',
            extraction_completed_at: completionIso,
            processed_at: completionIso,
            error_message: null,
            extraction_error: null,
            companies_extracted: companiesInEmail
          })
          .eq('id', email.id);

        if (updateEmailError) {
          console.error(`${logPrefix} [DB:ERROR] Failed to update email status:`, {
            emailId: email.id,
            error: updateEmailError
          });
        }

        processedCount++;

        await pushPipelineUpdate(userId, {
          type: 'background_progress',
          status: 'extracting',
          message: `Background: Processed ${processedCount} emails`,
          processedCount,
          totalCount: totalQueued,
          companiesExtracted
        });
      } catch (error) {
        console.error(`${logPrefix} Failed to process email ${email.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Email ${email.id}: ${errorMessage}`);
        failedCount++;

        const failureIso = new Date().toISOString();

        await supabase
          .from('emails')
          .update({
            processing_status: 'failed',
            extraction_status: 'failed',
            extraction_error: errorMessage,
            error_message: errorMessage,
            processed_at: failureIso,
            extraction_completed_at: failureIso
          })
          .eq('id', email.id);

        processedCount++;

        await pushPipelineUpdate(userId, {
          type: 'background_progress',
          status: 'extracting',
          message: `Background: Failed to process ${email.newsletter_name || 'newsletter'} (${errorMessage})`,
          processedCount,
          totalCount: totalQueued,
          companiesExtracted,
          failedCount
        });
      }
    }
  }

  const { count: remainingCount } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('processing_status', 'pending');

  const remaining = remainingCount || 0;

  if (remaining === 0 && processedCount > 0) {
    pushPipelineUpdate(userId, {
      type: 'background_complete',
      status: 'complete',
      message: 'All emails have been processed',
      processedCount,
      companiesExtracted
    });

    createPipelineAlert('info', 'Background Processing Complete',
      `Processed ${processedCount} emails, extracted ${companiesExtracted} companies`,
      { userId, processedCount, companiesExtracted }
    );
  }

  console.log(`${logPrefix} Finished background processor`, {
    processed: processedCount,
    remaining,
    companiesExtracted,
    failed: failedCount,
    errors: errors.length
  });

  console.log(`${logPrefix} Finished background processor`, { processed: processedCount, remaining, companiesExtracted, failed: failedCount, errors: errors.length });

  return {
    success: errors.length === 0,
    processed: processedCount,
    remaining,
    companiesExtracted,
    failed: failedCount,
    errors: errors.length > 0 ? errors : undefined
  };
}
