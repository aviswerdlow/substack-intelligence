import { NextResponse } from 'next/server';
import { ClaudeExtractor } from '@substack-intelligence/ai';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  const startTime = Date.now();
  
  try {
    const supabase = createServiceRoleClient();
    const extractor = new ClaudeExtractor();
    
    console.log('Starting batch extraction process...');
    
    // Get all unprocessed emails
    const { data: emails, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .or('processing_status.is.null,processing_status.neq.completed')
      .order('received_at', { ascending: false });
    
    if (emailError) {
      throw new Error(`Failed to fetch emails: ${emailError.message}`);
    }
    
    if (!emails || emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unprocessed emails found',
        data: {
          emailsProcessed: 0,
          companiesExtracted: 0
        }
      });
    }
    
    console.log(`Found ${emails.length} unprocessed emails`);
    
    let totalCompanies = 0;
    let processedCount = 0;
    let failedCount = 0;
    
    // Process each email
    for (const email of emails) {
      try {
        console.log(`Processing email: ${email.subject} from ${email.newsletter_name}`);
        
        // Extract companies from email content
        const result = await extractor.extractCompanies(
          email.clean_text || email.raw_html || '',
          email.newsletter_name
        );
        
        if (result.companies && result.companies.length > 0) {
          // Store extracted companies
          for (const company of result.companies) {
            // Insert or update company
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .upsert({
                name: company.name,
                description: company.description,
                website: company.website,
                funding_status: company.fundingStatus || 'unknown',
                mention_count: 1
              }, {
                onConflict: 'name',
                ignoreDuplicates: false
              })
              .select('id')
              .single();
            
            if (!companyError && companyData) {
              // Create company mention
              await supabase
                .from('company_mentions')
                .insert({
                  company_id: companyData.id,
                  email_id: email.id,
                  context: company.context,
                  sentiment: company.sentiment,
                  confidence: company.confidence,
                  extracted_at: new Date().toISOString()
                });
              
              // Increment mention count
              await supabase.rpc('increment_mention_count', {
                company_id: companyData.id
              });
              
              totalCompanies++;
            }
          }
        }
        
        // Mark email as processed
        await supabase
          .from('emails')
          .update({ 
            processing_status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', email.id);
        
        processedCount++;
        
      } catch (error) {
        console.error(`Failed to process email ${email.id}:`, error);
        failedCount++;
        
        // Mark email as failed
        await supabase
          .from('emails')
          .update({ 
            processing_status: 'failed',
            processing_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', email.id);
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`Extraction completed: ${processedCount} emails processed, ${totalCompanies} companies extracted`);
    
    return NextResponse.json({
      success: true,
      data: {
        emailsProcessed: processedCount,
        emailsFailed: failedCount,
        companiesExtracted: totalCompanies,
        processingTime
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Batch extraction failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}