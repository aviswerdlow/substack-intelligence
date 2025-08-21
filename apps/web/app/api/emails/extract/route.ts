import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { ClaudeExtractor } from '@substack-intelligence/ai';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Fetch all recent emails
    const { data: emails, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(10);
    
    if (fetchError) {
      throw new Error(`Failed to fetch emails: ${fetchError.message}`);
    }
    
    if (!emails || emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No emails to process',
        data: {
          emailsProcessed: 0,
          companiesExtracted: 0
        }
      });
    }
    
    console.log(`Found ${emails.length} emails to process for extraction`);
    
    // Initialize Claude extractor
    const extractor = new ClaudeExtractor();
    
    let totalCompaniesExtracted = 0;
    const extractionResults = [];
    
    // Process each email
    for (const email of emails) {
      try {
        console.log(`Extracting companies from email: ${email.subject}`);
        
        // Extract companies from email content (using correct column names)
        const extractionResult = await extractor.extractCompanies(
          email.clean_text || email.raw_html || '',
          email.newsletter_name || 'Unknown Newsletter'
        );
        
        console.log(`Extracted ${extractionResult.companies.length} companies from ${email.subject}`);
        console.log('Extracted companies:', extractionResult.companies.map(c => c.name));
        
        // Store extracted companies in the database
        for (const company of extractionResult.companies) {
          // Check if company already exists
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id, mention_count')
            .eq('name', company.name)
            .single();
          
          if (existingCompany) {
            // Update existing company mention count
            await supabase
              .from('companies')
              .update({
                mention_count: (existingCompany.mention_count || 0) + 1,
                last_updated_at: new Date().toISOString()
              })
              .eq('id', existingCompany.id);
            
            // Create company mention record
            await supabase
              .from('company_mentions')
              .insert({
                company_id: existingCompany.id,
                email_id: email.id,
                context: company.context || 'Mentioned in newsletter',
                sentiment: 'neutral', // Default to neutral, could be enhanced with sentiment analysis
                confidence: company.confidence || 0.8,
                extracted_at: new Date().toISOString()
              });
          } else {
            // Create new company
            console.log(`Creating new company: ${company.name}`);
            // Generate normalized name for the company
            const normalizedName = company.name.toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '') + '-' + Date.now();
            
            const { data: newCompany, error: companyError } = await supabase
              .from('companies')
              .insert({
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
            
            if (companyError) {
              console.error(`Failed to create company ${company.name}:`, companyError);
            } else {
              console.log(`Successfully created company ${company.name} with ID ${newCompany?.id}`);
            }
            
            if (newCompany) {
              // Create company mention record
              await supabase
                .from('company_mentions')
                .insert({
                  company_id: newCompany.id,
                  email_id: email.id,
                  context: company.context || 'Mentioned in newsletter',
                  sentiment: 'neutral', // Default to neutral, could be enhanced with sentiment analysis
                  confidence: company.confidence || 0.8,
                  extracted_at: new Date().toISOString()
                });
            }
          }
          
          totalCompaniesExtracted++;
        }
        
        // Email processing complete (no processed field to update)
        
        extractionResults.push({
          emailId: email.id,
          subject: email.subject,
          companiesFound: extractionResult.companies.length
        });
        
      } catch (emailError) {
        console.error(`Failed to process email ${email.id}:`, emailError);
        extractionResults.push({
          emailId: email.id,
          subject: email.subject,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        emailsProcessed: emails.length,
        companiesExtracted: totalCompaniesExtracted,
        results: extractionResults
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Email extraction failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check extraction status
export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get counts
    const [emailsResult, companiesResult, mentionsResult] = await Promise.all([
      supabase.from('emails').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('company_mentions').select('*', { count: 'exact', head: true })
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        totalEmails: emailsResult.count || 0,
        totalCompanies: companiesResult.count || 0,
        totalMentions: mentionsResult.count || 0
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Failed to get extraction status:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}