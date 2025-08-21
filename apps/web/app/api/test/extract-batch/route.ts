import { NextRequest, NextResponse } from 'next/server';
import { ClaudeExtractor } from '@substack-intelligence/ai';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body for batch size
    let batchSize = 5; // Default to 5 emails
    try {
      const body = await request.json();
      if (body.batchSize && typeof body.batchSize === 'number') {
        batchSize = Math.min(Math.max(body.batchSize, 1), 20); // Limit between 1 and 20
      }
    } catch {
      // If no body or invalid JSON, use default
    }
    
    const supabase = createServiceRoleClient();
    const extractor = new ClaudeExtractor();
    
    console.log(`Starting batch extraction for ${batchSize} emails...`);
    
    // Get a batch of unprocessed emails
    const { data: emails, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .or('processing_status.is.null,processing_status.neq.completed')
      .order('received_at', { ascending: false })
      .limit(batchSize);
    
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
    
    console.log(`Processing ${emails.length} emails...`);
    
    let totalCompanies = 0;
    let processedCount = 0;
    const results = [];
    
    // Process each email
    for (const email of emails) {
      try {
        console.log(`Processing: ${email.subject}`);
        
        // Extract companies from email content
        const result = await extractor.extractCompanies(
          email.clean_text || email.raw_html || '',
          email.newsletter_name
        );
        
        results.push({
          emailId: email.id,
          subject: email.subject,
          newsletter: email.newsletter_name,
          companiesFound: result.companies?.length || 0,
          companies: result.companies
        });
        
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
                funding_status: company.fundingStatus || 'unknown'
              }, {
                onConflict: 'name',
                ignoreDuplicates: false
              })
              .select('id')
              .single();
            
            if (!companyError && companyData) {
              // Create company mention
              const { error: mentionError } = await supabase
                .from('company_mentions')
                .insert({
                  company_id: companyData.id,
                  email_id: email.id,
                  context: company.context,
                  sentiment: company.sentiment,
                  confidence: company.confidence,
                  extracted_at: new Date().toISOString()
                });
              
              if (!mentionError) {
                // Update mention count manually
                const { data: currentCompany } = await supabase
                  .from('companies')
                  .select('mention_count')
                  .eq('id', companyData.id)
                  .single();
                
                await supabase
                  .from('companies')
                  .update({ 
                    mention_count: (currentCompany?.mention_count || 0) + 1 
                  })
                  .eq('id', companyData.id);
                
                totalCompanies++;
              } else {
                console.error('Failed to create mention:', mentionError);
              }
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
        results.push({
          emailId: email.id,
          subject: email.subject,
          newsletter: email.newsletter_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`Batch extraction completed: ${processedCount}/${emails.length} emails, ${totalCompanies} companies`);
    
    return NextResponse.json({
      success: true,
      data: {
        emailsProcessed: processedCount,
        companiesExtracted: totalCompanies,
        processingTime,
        details: results
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