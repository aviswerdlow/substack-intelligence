import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { GmailConnector } from '@substack-intelligence/ingestion';
import { ClaudeExtractor } from '@substack-intelligence/ai';

// Force Node.js runtime for full compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Pipeline status tracking
let pipelineStatus = {
  status: 'idle' as 'idle' | 'fetching' | 'extracting' | 'complete' | 'error',
  progress: 0,
  message: '',
  lastSync: null as Date | null,
  stats: {
    emailsFetched: 0,
    companiesExtracted: 0,
    newCompanies: 0,
    totalMentions: 0
  }
};

// GET endpoint to check pipeline status
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Check if data is fresh (less than 15 minutes old)
    const dataIsFresh = pipelineStatus.lastSync && 
      (Date.now() - pipelineStatus.lastSync.getTime()) < 15 * 60 * 1000;

    return NextResponse.json({
      success: true,
      data: {
        ...pipelineStatus,
        dataIsFresh,
        nextSyncIn: dataIsFresh ? 
          Math.max(0, 15 * 60 * 1000 - (Date.now() - (pipelineStatus.lastSync?.getTime() || 0))) : 
          0
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Failed to get pipeline status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to trigger unified pipeline
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse request body for options
    let options = {
      forceRefresh: false,
      daysBack: 30
    };
    
    try {
      const body = await request.json();
      options = { ...options, ...body };
    } catch {
      // Use defaults if no body
    }

    // Check if data is fresh and skip if not forcing refresh
    if (!options.forceRefresh && pipelineStatus.lastSync) {
      const timeSinceLastSync = Date.now() - pipelineStatus.lastSync.getTime();
      if (timeSinceLastSync < 15 * 60 * 1000) { // 15 minutes
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'Data is still fresh, skipping sync',
          data: pipelineStatus,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        });
      }
    }

    // Start pipeline
    pipelineStatus = {
      status: 'fetching',
      progress: 10,
      message: 'Fetching emails from Gmail...',
      lastSync: null,
      stats: {
        emailsFetched: 0,
        companiesExtracted: 0,
        newCompanies: 0,
        totalMentions: 0
      }
    };

    // Step 1: Fetch emails from Gmail
    console.log('Starting unified pipeline - Step 1: Fetching emails');
    const connector = new GmailConnector();
    
    const emails = await connector.fetchDailySubstacks(options.daysBack);
    
    pipelineStatus.stats.emailsFetched = emails.length;
    pipelineStatus.progress = 40;
    pipelineStatus.message = `Fetched ${emails.length} emails, extracting companies...`;
    
    console.log(`Fetched ${emails.length} emails from Gmail`);

    // Step 2: Extract companies from emails
    pipelineStatus.status = 'extracting';
    
    const supabase = createServiceRoleClient();
    const extractor = new ClaudeExtractor();
    
    // Get the latest emails from database (just inserted by fetchDailySubstacks)
    const { data: dbEmails, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(Math.min(emails.length || 10, 50)); // Process up to 50 emails
    
    if (fetchError) {
      throw new Error(`Failed to fetch emails from database: ${fetchError.message}`);
    }
    
    let totalCompaniesExtracted = 0;
    let newCompaniesCount = 0;
    let totalMentions = 0;
    
    if (dbEmails && dbEmails.length > 0) {
      console.log(`Processing ${dbEmails.length} emails for company extraction`);
      
      // Process each email
      for (let i = 0; i < dbEmails.length; i++) {
        const email = dbEmails[i];
        
        // Update progress
        const extractionProgress = 40 + (40 * (i + 1) / dbEmails.length);
        pipelineStatus.progress = Math.round(extractionProgress);
        pipelineStatus.message = `Extracting companies from email ${i + 1}/${dbEmails.length}...`;
        
        try {
          // Extract companies from email content
          const extractionResult = await extractor.extractCompanies(
            email.clean_text || email.raw_html || '',
            email.newsletter_name || 'Unknown Newsletter'
          );
          
          console.log(`Extracted ${extractionResult.companies.length} companies from: ${email.subject}`);
          
          // Store extracted companies
          for (const company of extractionResult.companies) {
            // Check if company already exists
            const { data: existingCompany } = await supabase
              .from('companies')
              .select('id, mention_count')
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
                  company_id: existingCompany.id,
                  email_id: email.id,
                  context: company.context || 'Mentioned in newsletter',
                  sentiment: 'neutral',
                  confidence: company.confidence || 0.8,
                  extracted_at: new Date().toISOString()
                });
            } else {
              // Create new company
              newCompaniesCount++;
              const normalizedName = company.name.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') + '-' + Date.now();
              
              const { data: newCompany } = await supabase
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
              
              if (newCompany) {
                // Create mention record
                await supabase
                  .from('company_mentions')
                  .insert({
                    company_id: newCompany.id,
                    email_id: email.id,
                    context: company.context || 'Mentioned in newsletter',
                    sentiment: 'neutral',
                    confidence: company.confidence || 0.8,
                    extracted_at: new Date().toISOString()
                  });
              }
            }
            
            totalCompaniesExtracted++;
            totalMentions++;
          }
        } catch (emailError) {
          console.error(`Failed to process email ${email.id}:`, emailError);
        }
      }
    }
    
    // Complete pipeline
    pipelineStatus = {
      status: 'complete',
      progress: 100,
      message: 'Pipeline completed successfully',
      lastSync: new Date(),
      stats: {
        emailsFetched: emails.length,
        companiesExtracted: totalCompaniesExtracted,
        newCompanies: newCompaniesCount,
        totalMentions: totalMentions
      }
    };
    
    console.log('Pipeline completed:', pipelineStatus.stats);
    
    return NextResponse.json({
      success: true,
      data: pipelineStatus,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Pipeline failed:', error);
    
    pipelineStatus = {
      status: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Pipeline failed',
      lastSync: pipelineStatus.lastSync,
      stats: pipelineStatus.stats
    };
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: pipelineStatus
    }, { status: 500 });
  }
}