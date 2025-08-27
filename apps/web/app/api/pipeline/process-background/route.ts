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
    const maxProcessingTime = 50000; // 50 seconds with 60s maxDuration
    
    // Get pending emails for this user
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .eq('extraction_status', 'pending')
      .order('received_at', { ascending: false })
      .limit(batchSize);
    
    if (fetchError) {
      console.error('Failed to fetch pending emails:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch pending emails'
      }, { status: 500 });
    }
    
    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        remaining: 0,
        message: 'No pending emails to process'
      });
    }
    
    console.log(`Background processing ${pendingEmails.length} emails for user ${userId}`);
    
    // Initialize Claude extractor
    let extractor;
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
    
    // Process each email
    for (const email of pendingEmails) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > maxProcessingTime) {
        console.log(`Background processing timeout, processed ${processedCount} of ${pendingEmails.length}`);
        break;
      }
      
      try {
        // Mark as processing
        await supabase
          .from('emails')
          .update({
            extraction_status: 'processing',
            extraction_started_at: new Date().toISOString()
          })
          .eq('id', email.id);
        
        // Skip if no content
        const content = email.clean_text || email.raw_html || '';
        if (!content || content.trim().length < 100) {
          await supabase
            .from('emails')
            .update({
              extraction_status: 'completed',
              extraction_completed_at: new Date().toISOString(),
              companies_extracted: 0
            })
            .eq('id', email.id);
          
          processedCount++;
          continue;
        }
        
        // Extract companies
        const extractionResult = await extractor.extractCompanies(
          content,
          email.newsletter_name || 'Unknown Newsletter'
        );
        
        console.log(`Extracted ${extractionResult.companies.length} companies from email ${email.id}`);
        
        // Store extracted companies
        for (const company of extractionResult.companies) {
          // Check if company exists for this user
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id, mention_count')
            .eq('user_id', userId)
            .eq('name', company.name)
            .single();
          
          if (existingCompany) {
            // Update existing company
            await supabase
              .from('companies')
              .update({
                mention_count: (existingCompany.mention_count || 0) + 1,
                last_updated_at: new Date().toISOString()
              })
              .eq('id', existingCompany.id);
            
            // Create mention record
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
            // Create new company
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
              // Create mention record
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
          
          companiesExtracted++;
        }
        
        // Mark email as completed
        await supabase
          .from('emails')
          .update({
            extraction_status: 'completed',
            extraction_completed_at: new Date().toISOString(),
            companies_extracted: extractionResult.companies.length
          })
          .eq('id', email.id);
        
        processedCount++;
        
        // Send progress update
        pushPipelineUpdate(userId, {
          type: 'background_progress',
          status: 'extracting',
          message: `Background: Processed ${processedCount} of ${pendingEmails.length} emails`,
          processedCount,
          totalCount: pendingEmails.length,
          companiesExtracted
        });
        
      } catch (error) {
        console.error(`Failed to process email ${email.id}:`, error);
        errors.push(`Email ${email.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Mark as failed
        await supabase
          .from('emails')
          .update({
            extraction_status: 'failed',
            extraction_error: error instanceof Error ? error.message : 'Unknown error',
            extraction_completed_at: new Date().toISOString()
          })
          .eq('id', email.id);
        
        processedCount++;
      }
    }
    
    // Check if there are more pending emails
    const { count: remainingCount } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('extraction_status', 'pending');
    
    const remaining = remainingCount || 0;
    
    // Send completion update if all done
    if (remaining === 0) {
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
    
    return NextResponse.json({
      success: true,
      processed: processedCount,
      remaining,
      companiesExtracted,
      errors: errors.length > 0 ? errors : undefined,
      message: remaining > 0 
        ? `Processed ${processedCount} emails, ${remaining} remaining`
        : `All emails processed successfully`
    });
    
  } catch (error) {
    console.error('Background processing error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}