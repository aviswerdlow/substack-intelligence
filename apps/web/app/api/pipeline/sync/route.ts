import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { GmailConnector } from '@substack-intelligence/ingestion';
import { ClaudeExtractor } from '@substack-intelligence/ai';
import { PipelineMonitor, createPipelineAlert, logPipelineHealthCheck } from '@/lib/monitoring/pipeline-metrics';
import { pipelineCacheManager } from '@/lib/cache/pipeline-cache';
import { pushPipelineUpdate } from '@/lib/pipeline-updates';

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

    // Check Gmail OAuth configuration for status reporting
    const oauthValidation = validateGmailOAuthConfig();
    if (!oauthValidation.isValid) {
      console.warn('Gmail OAuth configuration missing for status check:', oauthValidation.missingVars);
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
          0,
        configurationStatus: {
          isOAuthConfigured: oauthValidation.isValid,
          missingEnvVars: oauthValidation.missingVars
        }
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

// Validate Gmail OAuth environment variables
function validateGmailOAuthConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

// POST endpoint to trigger unified pipeline
export async function POST(request: NextRequest) {
  const monitor = new PipelineMonitor();
  
  try {
    monitor.startStep('authentication', { userAgent: request.headers.get('user-agent') });
    
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      monitor.failStep('authentication', new Error('Unauthorized access attempt'));
      createPipelineAlert('error', 'Authentication Failed', 'Unauthorized pipeline access attempt');
      
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    monitor.completeStep('authentication', { userId: user?.id || 'development' });

    // Validate Gmail OAuth configuration
    monitor.startStep('configuration_validation');
    const oauthValidation = validateGmailOAuthConfig();
    
    if (!oauthValidation.isValid) {
      monitor.setHealthStatus('configuration', false, `Missing environment variables: ${oauthValidation.missingVars.join(', ')}`);
      monitor.failStep('configuration_validation', new Error('OAuth configuration incomplete'));
      
      createPipelineAlert('error', 'Configuration Error', 
        `Gmail OAuth configuration incomplete. Missing: ${oauthValidation.missingVars.join(', ')}`,
        { missingVars: oauthValidation.missingVars }
      );
      
      return NextResponse.json({
        success: false,
        error: `Gmail OAuth configuration incomplete. Missing environment variables: ${oauthValidation.missingVars.join(', ')}. Please check your environment setup.`,
        details: {
          missingVars: oauthValidation.missingVars,
          setupRequired: true
        }
      }, { status: 500 });
    }
    
    // Get user's Gmail tokens from database
    const userId = user?.id || 'dev';
    const { UserSettingsService } = await import('@/lib/user-settings');
    const userSettingsService = new UserSettingsService();
    const gmailTokens = await userSettingsService.getGmailTokens(userId);
    
    if (!gmailTokens || !gmailTokens.refreshToken) {
      monitor.setHealthStatus('configuration', false, 'User has not connected Gmail');
      monitor.failStep('configuration_validation', new Error('Gmail not connected'));
      
      return NextResponse.json({
        success: false,
        error: 'Gmail account not connected. Please connect your Gmail account in Settings first.',
        details: {
          gmailConnected: false,
          setupRequired: true
        }
      }, { status: 400 });
    }
    
    monitor.completeStep('configuration_validation', { configurationValid: true, gmailConnected: true });
    monitor.setHealthStatus('configuration', true);

    // Check for concurrent pipeline runs
    monitor.startStep('sync_lock_check');
    if (pipelineCacheManager.getSyncLock()) {
      monitor.failStep('sync_lock_check', new Error('Pipeline already running'));
      
      createPipelineAlert('warning', 'Concurrent Pipeline Run Blocked', 
        'Another pipeline sync is already in progress',
        { sessionId: monitor.getCurrentMetrics() }
      );
      
      return NextResponse.json({
        success: false,
        error: 'Pipeline sync already in progress. Please wait for the current sync to complete.',
        details: {
          concurrentRunBlocked: true,
          retryAfter: 300 // seconds
        }
      }, { status: 429 });
    }
    
    // Acquire sync lock
    pipelineCacheManager.setSyncLock();
    monitor.completeStep('sync_lock_check', { lockAcquired: true });

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
    monitor.startStep('gmail_fetch', { daysBack: options.daysBack, forceRefresh: options.forceRefresh });
    
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
    
    // Push initial status update
    pushPipelineUpdate(userId, {
      type: 'status',
      status: 'fetching',
      progress: 10,
      message: 'Connecting to Gmail...',
      stats: pipelineStatus.stats
    });

    // Step 1: Fetch emails from Gmail
    try {
      const connector = new GmailConnector(gmailTokens.refreshToken);
      const fetchStartTime = Date.now();
      
      const emails = await connector.fetchDailySubstacks(options.daysBack);
      const fetchDuration = Date.now() - fetchStartTime;
      
      monitor.setMetric('emailsFetched', emails.length);
      monitor.trackGmailApiCall('fetchDailySubstacks', true, fetchDuration);
      monitor.completeStep('gmail_fetch', { 
        emailsCount: emails.length, 
        duration: fetchDuration,
        daysBack: options.daysBack 
      });
      
      pipelineStatus.stats.emailsFetched = emails.length;
      pipelineStatus.progress = 40;
      pipelineStatus.message = `Fetched ${emails.length} emails, extracting companies...`;
      
      // Push update after fetching emails
      pushPipelineUpdate(userId, {
        type: 'emails_fetched',
        status: 'extracting',
        progress: 40,
        message: `Found ${emails.length} newsletters to analyze`,
        stats: pipelineStatus.stats,
        emailCount: emails.length
      });
      
      if (emails.length === 0) {
        createPipelineAlert('warning', 'No Emails Found', 
          `No Substack emails found in the last ${options.daysBack} days`,
          { daysBack: options.daysBack }
        );
      }
    } catch (gmailError) {
      monitor.setHealthStatus('gmail', false, gmailError instanceof Error ? gmailError.message : 'Gmail fetch failed');
      monitor.trackGmailApiCall('fetchDailySubstacks', false, undefined, gmailError instanceof Error ? gmailError : new Error('Gmail fetch failed'));
      throw gmailError;
    }

    // Step 2: Extract companies from emails
    monitor.startStep('company_extraction');
    pipelineStatus.status = 'extracting';
    
    let totalCompaniesExtracted = 0;
    let newCompaniesCount = 0;
    let totalMentions = 0;
    
    try {
      const supabase = createServiceRoleClient();
      const extractor = new ClaudeExtractor();
      
      // Get the latest emails from database (just inserted by fetchDailySubstacks)
      const dbQueryStartTime = Date.now();
      const { data: dbEmails, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(Math.min(pipelineStatus.stats.emailsFetched || 10, 50)); // Process up to 50 emails
      
      monitor.trackDatabaseOperation('select', 'emails', dbEmails?.length, !fetchError, fetchError || undefined);
      
      if (fetchError) {
        monitor.setHealthStatus('database', false, fetchError.message);
        throw new Error(`Failed to fetch emails from database: ${fetchError.message}`);
      }
      
      if (dbEmails && dbEmails.length > 0) {
        monitor.setMetric('emailsProcessed', dbEmails.length);
        monitor.completeStep('database_fetch', { emailsRetrieved: dbEmails.length, duration: Date.now() - dbQueryStartTime });
      
      // Process each email
      const companiesFound: any[] = [];
      const newlyDiscoveredCompanies = new Set<string>(); // Track companies discovered in this run
      const processingStartTime = Date.now();
      
      for (let i = 0; i < dbEmails.length; i++) {
        const email = dbEmails[i];
        
        // Update progress
        const extractionProgress = 40 + (40 * (i + 1) / dbEmails.length);
        pipelineStatus.progress = Math.round(extractionProgress);
        pipelineStatus.message = `Extracting companies from email ${i + 1}/${dbEmails.length}...`;
        
        // Push granular progress update
        const elapsedTime = (Date.now() - processingStartTime) / 1000;
        const emailsPerSecond = (i + 1) / elapsedTime;
        const remainingEmails = dbEmails.length - (i + 1);
        const estimatedTimeRemaining = remainingEmails / emailsPerSecond;
        
        pushPipelineUpdate(userId, {
          type: 'processing_email',
          status: 'extracting',
          progress: Math.round(extractionProgress),
          message: `Analyzing "${email.newsletter_name || email.subject}"...`,
          stats: {
            ...pipelineStatus.stats,
            companiesExtracted: totalCompaniesExtracted,
            newCompanies: newCompaniesCount,
            totalMentions: totalMentions  // Include current totalMentions in progress updates
          },
          currentEmail: i + 1,
          totalEmails: dbEmails.length,
          estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
          companiesFound: companiesFound.slice(-5) // Last 5 companies
        });
        
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
              
              // Track for live updates
              companiesFound.push({
                name: company.name,
                description: company.description,
                isNew: false,
                source: email.newsletter_name || email.subject
              });
              
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
                
                // Track for live updates
                companiesFound.push({
                  name: company.name,
                  description: company.description,
                  isNew: true,
                  source: email.newsletter_name || email.subject
                });
                
                // Only push discovery update if this is the FIRST time we've seen this company in this run
                if (!newlyDiscoveredCompanies.has(company.name)) {
                  newlyDiscoveredCompanies.add(company.name);
                  
                  pushPipelineUpdate(userId, {
                    type: 'company_discovered',
                    company: {
                      name: company.name,
                      description: company.description,
                      isNew: true
                    },
                    stats: {
                      ...pipelineStatus.stats,
                      companiesExtracted: totalCompaniesExtracted + 1,
                      newCompanies: newCompaniesCount,
                      totalMentions: totalMentions  // Include current totalMentions
                    }
                  });
                }
              }
            }
            
            totalCompaniesExtracted++;
            totalMentions++;
          }
        } catch (emailError) {
          monitor.trackExtractionOperation(email.id, 0, false, emailError instanceof Error ? emailError : new Error('Email processing failed'));
          
          createPipelineAlert('warning', 'Email Processing Failed', 
            `Failed to process email: ${email.subject}`,
            { emailId: email.id, error: emailError instanceof Error ? emailError.message : 'Unknown error' }
          );
        }
      }
      
      monitor.completeStep('company_extraction', {
        emailsProcessed: dbEmails.length,
        totalCompaniesExtracted,
        newCompaniesCount,
        totalMentions
      });
    } else {
      monitor.completeStep('company_extraction', { emailsProcessed: 0, reason: 'no_emails' });
      createPipelineAlert('warning', 'No Emails to Process', 'No emails found in database for company extraction');
    }
    } catch (extractionError) {
      monitor.failStep('company_extraction', extractionError instanceof Error ? extractionError : new Error('Company extraction failed'));
      throw extractionError;
    }
    
    // Complete pipeline
    monitor.startStep('pipeline_completion');
    
    // Update the final stats first
    pipelineStatus = {
      status: 'complete',
      progress: 100,
      message: 'Pipeline completed successfully',
      lastSync: new Date(),
      stats: {
        emailsFetched: pipelineStatus.stats.emailsFetched,
        companiesExtracted: totalCompaniesExtracted,
        newCompanies: newCompaniesCount,
        totalMentions: totalMentions
      }
    };
    
    // Now push completion update with the updated stats
    pushPipelineUpdate(userId, {
      type: 'complete',
      status: 'complete',
      progress: 100,
      message: `Discovered ${totalCompaniesExtracted} companies (${newCompaniesCount} new) from ${pipelineStatus.stats.emailsFetched} newsletters`,
      stats: pipelineStatus.stats  // Now this has the correct totalMentions
    });
    
    // Update final metrics
    monitor.setMetric('companiesExtracted', totalCompaniesExtracted);
    monitor.setMetric('newCompanies', newCompaniesCount);
    monitor.setMetric('totalMentions', totalMentions);
    
    const monitoringResults = monitor.complete(true, pipelineStatus.stats);
    
    // Create success alert for significant results
    if (totalCompaniesExtracted > 0) {
      createPipelineAlert('info', 'Pipeline Completed Successfully', 
        `Pipeline extracted ${totalCompaniesExtracted} companies (${newCompaniesCount} new) from ${pipelineStatus.stats.emailsFetched} emails`,
        {
          ...pipelineStatus.stats,
          executionTime: monitoringResults.metrics.executionTime,
          sessionId: monitoringResults.sessionId
        }
      );
    }
    
    // Invalidate cache after successful pipeline run
    pipelineCacheManager.invalidateAll();
    
    // Release sync lock
    pipelineCacheManager.clearSyncLock();
    
    return NextResponse.json({
      success: true,
      data: pipelineStatus,
      monitoring: {
        sessionId: monitoringResults.sessionId,
        summary: monitoringResults.summary
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown pipeline error';
    const monitoringResults = monitor.complete(false);
    
    // Release sync lock on error
    pipelineCacheManager.clearSyncLock();
    
    // Create critical alert for pipeline failure
    createPipelineAlert('error', 'Pipeline Failed', 
      `Pipeline execution failed: ${errorMessage}`,
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: monitoringResults.sessionId,
        executionTime: monitoringResults.metrics.executionTime,
        metrics: monitoringResults.metrics
      }
    );
    
    pipelineStatus = {
      status: 'error',
      progress: 0,
      message: errorMessage,
      lastSync: pipelineStatus.lastSync,
      stats: pipelineStatus.stats
    };
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: pipelineStatus,
      monitoring: {
        sessionId: monitoringResults.sessionId,
        summary: monitoringResults.summary,
        errorCount: monitoringResults.metrics.errors?.length || 0
      }
    }, { status: 500 });
  }
}