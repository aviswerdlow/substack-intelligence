import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { ClaudeExtractor } from '@substack-intelligence/ai';
import { pushPipelineUpdate } from '@/lib/pipeline-updates';
import { createPipelineAlert } from '@/lib/monitoring/pipeline-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Process pending emails for a user in the background
export async function POST(request: NextRequest) {
  try {
    const { userId, batchSize = 10 } = await request.json();
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }
    
    const supabase = createServiceRoleClient();
    const startTime = Date.now();
    const maxProcessingTime = 50000; // 50 seconds reserved for extraction
    const normalizedBatchSize = Math.max(1, Math.min(batchSize, 25));
    const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const forwardedProto =
      request.headers.get('x-forwarded-proto') ??
      (forwardedHost && forwardedHost.startsWith('localhost') ? 'http' : 'https');
    const origin =
      forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const followUpUrl = new URL('/api/pipeline/process-background', origin);
    const followUpHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key === 'cookie' || key === 'authorization' || key.startsWith('x-clerk-')) {
        followUpHeaders[key] = value;
      }
    });
    
    // Initialize Claude extractor once per invocation
    let extractor: ClaudeExtractor;
    try {
      extractor = new ClaudeExtractor();
    } catch (error) {
      console.error('Failed to initialize Claude extractor:', error);
      return NextResponse.json({
        success: false,
        error: 'AI service unavailable'
      }, { status: 500 });
    }
    
    let processedCount = 0;
    let companiesExtracted = 0;
    const errors: string[] = [];
    let totalQueued = 0;
    
    while (Date.now() - startTime < maxProcessingTime) {
      const { data: pendingEmails, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .eq('processing_status', 'pending')
        .order('received_at', { ascending: false })
        .limit(normalizedBatchSize);
      
      if (fetchError) {
        console.error('Failed to fetch pending emails:', fetchError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch pending emails'
        }, { status: 500 });
      }
      
      if (!pendingEmails || pendingEmails.length === 0) {
        break;
      }
      
      totalQueued += pendingEmails.length;
      console.log(`Background processing ${pendingEmails.length} emails for user ${userId}`);
      
      for (const email of pendingEmails) {
        const elapsedMs = Date.now() - startTime;
        if (elapsedMs > maxProcessingTime) {
          console.log(`Background processing timeout after ${elapsedMs}ms, processed ${processedCount} so far`);
          break;
        }
        const nowIso = new Date().toISOString();
        
        try {
          await supabase
            .from('emails')
            .update({
              processing_status: 'processing',
              extraction_status: 'processing',
              extraction_started_at: nowIso,
              processed_at: nowIso,
              error_message: null,
              extraction_error: null
            })
            .eq('id', email.id);
          
          const content = email.clean_text || email.raw_html || '';
          if (!content || content.trim().length < 20) {
            await supabase
              .from('emails')
              .update({
                processing_status: 'completed',
                extraction_status: 'completed',
                extraction_completed_at: nowIso,
                processed_at: nowIso,
                companies_extracted: 0,
                error_message: null,
                extraction_error: null
              })
              .eq('id', email.id);
            
            processedCount++;
            continue;
          }
          
          const extractionResult = await extractor.extractCompanies(
            content,
            email.newsletter_name || 'Unknown Newsletter'
          );
          
          console.log(`Extracted ${extractionResult.companies.length} companies from email ${email.id}`);
          
          let companiesInEmail = 0;
          
          for (const company of extractionResult.companies) {
            const { data: existingCompany } = await supabase
              .from('companies')
              .select('id, mention_count')
              .eq('user_id', userId)
              .eq('name', company.name)
              .single();
            
            if (existingCompany) {
              await supabase
                .from('companies')
                .update({
                  mention_count: (existingCompany.mention_count || 0) + 1,
                  last_updated_at: new Date().toISOString()
                })
                .eq('id', existingCompany.id);
              
              await supabase
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
            } else {
              const normalizedName = company.name.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') + '-' + Date.now();
              
              const { data: newCompany } = await supabase
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
              
              if (newCompany) {
                await supabase
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
              }
            }
            
            companiesInEmail++;
            companiesExtracted++;
          }
          
          await supabase
            .from('emails')
            .update({
              processing_status: 'completed',
              extraction_status: 'completed',
              extraction_completed_at: new Date().toISOString(),
              processed_at: new Date().toISOString(),
              error_message: null,
              extraction_error: null,
              companies_extracted: companiesInEmail
            })
            .eq('id', email.id);
          
          processedCount++;
          
          pushPipelineUpdate(userId, {
            type: 'background_progress',
            status: 'extracting',
            message: `Background: Processed ${processedCount} emails`,
            processedCount,
            totalCount: totalQueued,
            companiesExtracted
          });
        } catch (error) {
          console.error(`Failed to process email ${email.id}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Email ${email.id}: ${errorMessage}`);
          
          await supabase
            .from('emails')
            .update({
              processing_status: 'failed',
              extraction_status: 'failed',
              extraction_error: errorMessage,
              error_message: errorMessage,
              processed_at: new Date().toISOString()
            })
            .eq('id', email.id);
          
          processedCount++;
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

    let followUpTriggered = false;
    if (remaining > 0) {
      console.log(`[Background] ${remaining} emails still pending for user ${userId}. Scheduling follow-up run...`);
      try {
        const followUpResponse = await fetch(followUpUrl.toString(), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...followUpHeaders
          },
          cache: 'no-store',
          body: JSON.stringify({
            userId,
            batchSize: Math.min(normalizedBatchSize, remaining)
          })
        });

        if (!followUpResponse.ok) {
          const rawBody = await followUpResponse.text().catch(() => '');
          console.error('[Background] Follow-up trigger failed', {
            status: followUpResponse.status,
            statusText: followUpResponse.statusText,
            headers: Object.fromEntries(followUpResponse.headers.entries()),
            body: rawBody
          });
        } else {
          followUpTriggered = true;
          console.log('[Background] Follow-up run triggered successfully');
        }
      } catch (followError) {
        console.error('[Background] Failed to trigger follow-up run', followError);
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: processedCount,
      remaining,
      companiesExtracted,
      errors: errors.length > 0 ? errors : undefined,
      followUpTriggered,
      message: remaining > 0
        ? `Processed ${processedCount} emails, ${remaining} remaining`
        : remaining === 0 && processedCount > 0
          ? 'All emails processed successfully'
          : 'No pending emails to process'
    });
    
  } catch (error) {
    console.error('Background processing error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
