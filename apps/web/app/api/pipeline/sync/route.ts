import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import type { Database } from '@substack-intelligence/database';
import { GmailConnector } from '@substack-intelligence/ingestion';
import { processBackgroundEmails } from '../process-background/processor';
import { PipelineMonitor, createPipelineAlert, logPipelineHealthCheck } from '@/lib/monitoring/pipeline-metrics';
import pipelineCache, { pipelineCacheManager, CACHE_KEYS } from '@/lib/cache/pipeline-cache';
import { pushPipelineUpdate } from '@/lib/pipeline-updates';
import {
  buildMissingUserIdColumnResponse,
  isMissingUserIdColumnError,
  mapToMissingUserIdColumnError,
  MissingUserIdColumnError
} from '@/lib/supabase-errors';

// Force Node.js runtime for full compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // Allow up to 5 minutes for processing (Vercel Pro allows 300s)

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
    totalMentions: 0,
    failedEmails: 0
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
  const requestStartTime = Date.now(); // Track overall request start time
  const monitor = new PipelineMonitor();
  let userId = 'dev'; // Define userId outside try block for error handler access
  let lockAcquired = false; // Track if we acquired the lock

  // Set up a timeout to ensure we don't exceed Vercel's limits
  const timeoutHandle = setTimeout(() => {
    console.error('[Pipeline Sync] Pipeline execution timeout - forcefully releasing lock');
    if (lockAcquired) {
      pipelineCacheManager.clearSyncLock();
    }
  }, (maxDuration - 10) * 1000); // Release lock 10 seconds before max timeout

  const traceContext = {
    requestId: request.headers.get('x-request-id') || `sync-${Date.now()}`,
    url: request.url,
    ip: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent')
  };

  console.log('[Pipeline Sync] POST invoked', traceContext);

  const triggerBackgroundProcessing = async (
    queuedEmails: number,
    options: {
      fallbackProcessedCount?: number;
      messageOverride?: string;
      statusOverride?: 'extracting' | 'complete';
      rateLimited?: boolean;
    } = {}
  ): Promise<NextResponse> => {
    monitor.startStep('background_trigger', {
      emailsQueued: queuedEmails,
      rateLimited: !!options.rateLimited
    });

    console.log('[Pipeline Sync] Background processing loop starting', {
      queuedEmails,
      rateLimited: !!options.rateLimited,
      batchSize: Math.max(10, Math.min(20, queuedEmails || 15))
    });

    const batchSize = Math.max(10, Math.min(20, queuedEmails || 15));
    const maxProcessingTime = options.rateLimited ? 30000 : 45000;
    let remaining = queuedEmails;
    let totalProcessed = 0;
    let totalCompaniesExtracted = 0;
    let totalFailed = 0;
    let iterations = 0;
    const aggregatedErrors: string[] = [];

    try {
      do {
        iterations++;
        console.log('[Pipeline Sync] Background iteration started', {
          iteration: iterations,
          batchSize,
          maxProcessingTime,
          queuedEmails,
          elapsed: Date.now() - requestStartTime
        });

        const result = await processBackgroundEmails({
          userId,
          batchSize,
          maxProcessingTime,
          logPrefix: `[Pipeline Sync][run ${iterations}]`
        });

        totalProcessed += result.processed;
        totalCompaniesExtracted += result.companiesExtracted;
        totalFailed += result.failed;
        if (result.errors?.length) {
          aggregatedErrors.push(...result.errors);
        }
        remaining = result.remaining;

        console.log('[Pipeline Sync] Background iteration completed', {
          iteration: iterations,
          processed: result.processed,
          companiesExtracted: result.companiesExtracted,
          remaining,
          iterationErrors: result.errors?.length || 0
        });

        if (remaining <= 0 || result.processed === 0) {
          break;
        }

        if (Date.now() - requestStartTime > 270000) {
          console.log('[Pipeline Sync] Approaching request timeout, stopping additional background runs.');
          break;
        }
      } while (remaining > 0);

      monitor.completeStep('background_trigger', {
        triggered: true,
        runs: iterations,
        processed: totalProcessed,
        remaining
      });
    } catch (error) {
      monitor.failStep('background_trigger', error instanceof Error ? error : new Error('Background processing failed'));
      console.error('[Pipeline Sync] Background processing failed:', error);

      pipelineStatus = {
        status: 'error',
        progress: 0,
        message: 'Background processing failed. Please try again.',
        lastSync: pipelineStatus.lastSync,
        stats: pipelineStatus.stats
      };

      await pushPipelineUpdate(userId, {
        type: 'error',
        status: 'error',
        message: options.messageOverride || 'Background processing failed. Please try again shortly.',
        stats: pipelineStatus.stats
      });

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown background processing error'
      }, { status: 500 });
    }

    console.log('[Pipeline Sync] Background processing summary', {
      totalProcessed,
      totalCompaniesExtracted,
      remaining,
      iterations,
      aggregatedErrors,
      totalFailed
    });

    console.log('[Pipeline Sync] [STATS:UPDATE] Updating pipeline status:', {
      previousStats: pipelineStatus.stats,
      newCompaniesExtracted: totalCompaniesExtracted,
      totalProcessed: totalProcessed,
      totalFailed: totalFailed,
      remaining: remaining
    });

    pipelineStatus.stats.companiesExtracted = totalCompaniesExtracted;
    pipelineStatus.stats.totalMentions = totalCompaniesExtracted;
    pipelineStatus.stats.failedEmails = totalFailed;
    pipelineStatus.progress = remaining > 0 ? 90 : 100;
    pipelineStatus.lastSync = new Date();
    pipelineStatus.status = options.statusOverride ?? 'complete';
    pipelineStatus.message = options.messageOverride ?? (
      remaining > 0
        ? `Processed ${totalProcessed} emails. ${remaining} remaining - run pipeline again to continue.`
        : 'Pipeline completed successfully'
    );

    console.log('[Pipeline Sync] [STATS:FINAL] Final pipeline stats:', {
      stats: pipelineStatus.stats,
      status: pipelineStatus.status,
      progress: pipelineStatus.progress,
      message: pipelineStatus.message
    });

    if (aggregatedErrors.length) {
      await pushPipelineUpdate(userId, {
        type: 'status',
        status: 'extracting',
        progress: pipelineStatus.progress,
        message: `Encountered ${aggregatedErrors.length} Claude issues across ${totalFailed} emails; continuing with remaining ${remaining}.`,
        stats: pipelineStatus.stats,
        failedCount: totalFailed,
        errors: aggregatedErrors
      });
    }
    if (remaining > 0) {
      await pushPipelineUpdate(userId, {
        type: 'partial_completion',
        status: 'complete',
        progress: pipelineStatus.progress,
        message: pipelineStatus.message,
        stats: pipelineStatus.stats,
        remainingCount: remaining,
        failedCount: totalFailed
      });
    } else {
      await pushPipelineUpdate(userId, {
        type: 'complete',
        status: 'complete',
        progress: 100,
        message: `Discovered ${totalCompaniesExtracted} companies from ${pipelineStatus.stats.emailsFetched} newsletters`,
        stats: pipelineStatus.stats,
        failedCount: totalFailed
      });
    }

    monitor.setMetric('emailsProcessed', totalProcessed);
    monitor.setMetric('companiesExtracted', totalCompaniesExtracted);
    monitor.setMetric('newCompanies', pipelineStatus.stats.newCompanies);
    monitor.setMetric('totalMentions', pipelineStatus.stats.totalMentions);
    monitor.setMetric('failedEmails', totalFailed);

    const monitoringResults = monitor.complete(true, pipelineStatus.stats);

    pipelineCacheManager.invalidateAll();

    console.log('[Pipeline Sync] Background trigger completed', {
      queued: remaining > 0,
      batchSize,
      runs: iterations,
      remaining,
      aggregatedErrors: aggregatedErrors.length,
      failed: totalFailed
    });

    console.log('[Pipeline Sync] Background trigger completed', {
      queued: remaining > 0,
      batchSize,
      runs: iterations,
      remaining,
      aggregatedErrors: aggregatedErrors.length,
      failed: totalFailed
    });

    return NextResponse.json({
      success: true,
      data: pipelineStatus,
      background: {
        queued: remaining > 0,
        batchSize,
        runs: iterations,
        remaining,
        errors: aggregatedErrors.length ? aggregatedErrors : undefined,
        failed: totalFailed
      },
      monitoring: {
        sessionId: monitoringResults.sessionId,
        summary: monitoringResults.summary
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  };

  try {
    monitor.startStep('authentication', { userAgent: request.headers.get('user-agent') });
    
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      monitor.failStep('authentication', new Error('Unauthorized access attempt'));
      createPipelineAlert('error', 'Authentication Failed', 'Unauthorized pipeline access attempt');

      clearTimeout(timeoutHandle); // Clear timeout on early return

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

      clearTimeout(timeoutHandle); // Clear timeout on early return

      return NextResponse.json({
        success: false,
        error: `Gmail OAuth configuration incomplete. Missing environment variables: ${oauthValidation.missingVars.join(', ')}. Please check your environment setup.`,
        details: {
          missingVars: oauthValidation.missingVars,
          setupRequired: true
        }
      }, { status: 500 });
    }
    
    // Get user's Gmail tokens from database or Clerk
    userId = user?.id || 'dev';
    console.log('[Pipeline Sync] Starting Gmail configuration check for user:', userId);
    
    // First check if user has Google OAuth through Clerk directly
    console.log('[Pipeline Sync] Checking Clerk external accounts:', user?.externalAccounts?.map(a => ({
      provider: a.provider,
      email: a.emailAddress
    })));
    
    const hasClerkGoogleOAuth = user?.externalAccounts?.some(
      account => account.provider === 'google' || account.provider === 'oauth_google'
    ) || false;
    
    console.log('[Pipeline Sync] Has Clerk Google OAuth:', hasClerkGoogleOAuth);
    
    const { UserSettingsService } = await import('@/lib/user-settings');
    const userSettingsService = new UserSettingsService();
    const settings = await userSettingsService.getUserSettings(userId);
    
    console.log('[Pipeline Sync] User settings from database:', {
      gmail_connected: settings?.gmail_connected,
      has_refresh_token: !!settings?.gmail_refresh_token,
      gmail_email: settings?.gmail_email
    });
    
    // Check if user is using Clerk OAuth
    let useClerkOAuth = false;
    let gmailTokens = null;
    
    // If user has Clerk Google OAuth, use that regardless of database settings
    if (hasClerkGoogleOAuth) {
      console.log('[Pipeline Sync] Using Clerk OAuth - user signed in with Google');
      useClerkOAuth = true;
      gmailTokens = { useClerkOAuth: true };
      
      // Auto-update database to mark Gmail as connected if not already
      if (!settings?.gmail_connected) {
        const googleEmail = user?.externalAccounts?.find(
          account => account.provider === 'google' || account.provider === 'oauth_google'
        )?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';
        
        console.log('[Pipeline Sync] Auto-marking Gmail as connected for email:', googleEmail);
        
        await userSettingsService.createOrUpdateUserSettings(userId, {
          gmail_connected: true,
          gmail_email: googleEmail,
          gmail_refresh_token: JSON.stringify({
            useClerkOAuth: true,
            connectedAt: new Date().toISOString()
          })
        });
      }
    } else if (settings?.gmail_refresh_token) {
      console.log('[Pipeline Sync] Checking database refresh token type');
      // Check if the refresh token is a JSON string indicating Clerk OAuth
      try {
        const tokenData = JSON.parse(settings.gmail_refresh_token);
        useClerkOAuth = tokenData.useClerkOAuth === true;
        console.log('[Pipeline Sync] Parsed token data:', tokenData);
        if (useClerkOAuth) {
          console.log('[Pipeline Sync] Using Clerk OAuth from database settings');
          gmailTokens = { useClerkOAuth: true };
        }
      } catch {
        // Not JSON, it's a regular refresh token
        console.log('[Pipeline Sync] Using legacy OAuth - refresh token is not JSON');
        useClerkOAuth = false;
        gmailTokens = await userSettingsService.getGmailTokens(userId);
      }
    } else {
      // Legacy custom OAuth flow
      console.log('[Pipeline Sync] No Gmail configuration found - checking legacy OAuth');
      gmailTokens = await userSettingsService.getGmailTokens(userId);
    }
    
    console.log('[Pipeline Sync] Final OAuth configuration:', {
      useClerkOAuth,
      hasGmailTokens: !!gmailTokens,
      hasClerkGoogleOAuth
    });
    
    if (!gmailTokens && !hasClerkGoogleOAuth) {
      monitor.setHealthStatus('configuration', false, 'User has not connected Gmail');
      monitor.failStep('configuration_validation', new Error('Gmail not connected'));

      clearTimeout(timeoutHandle); // Clear timeout on early return

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

    // Check for concurrent pipeline runs with better stale lock detection
    monitor.startStep('sync_lock_check');

    // First, check if there's a stale lock and clear it
    const lockInfo = pipelineCacheManager.getSyncLock();
    if (lockInfo) {
      console.log('[Pipeline Sync] Existing lock detected, checking if stale...');

      // The getSyncLock method already handles stale locks (>10 min old)
      // but let's add an additional check for locks older than 5 minutes
      // since our maxDuration is 5 minutes
      const currentLock = pipelineCache.get(CACHE_KEYS.PIPELINE_SYNC_LOCK);
      if (currentLock && typeof currentLock === 'object' && 'timestamp' in currentLock) {
        const lockAge = Date.now() - (currentLock as { timestamp: number }).timestamp;
        if (lockAge > 5 * 60 * 1000) { // 5 minutes
          console.log(`[Pipeline Sync] Clearing stale lock (age: ${Math.round(lockAge/1000)}s)`);
          pipelineCacheManager.clearSyncLock();
        } else {
          monitor.failStep('sync_lock_check', new Error('Pipeline already running'));

          createPipelineAlert('warning', 'Concurrent Pipeline Run Blocked',
            'Another pipeline sync is already in progress',
            { sessionId: monitor.getCurrentMetrics(), lockAge: Math.round(lockAge/1000) }
          );

          clearTimeout(timeoutHandle); // Clear timeout if we're not proceeding

          return NextResponse.json({
            success: false,
            error: `Pipeline sync already in progress (running for ${Math.round(lockAge/1000)}s). Please wait for the current sync to complete or try again in a minute.`,
            details: {
              concurrentRunBlocked: true,
              lockAge: Math.round(lockAge/1000),
              retryAfter: Math.max(60, 300 - Math.round(lockAge/1000)) // seconds
            }
          }, { status: 429 });
        }
      }
    }

    // Acquire sync lock
    pipelineCacheManager.setSyncLock();
    lockAcquired = true; // Mark that we've acquired the lock
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
        // Release the lock since we're not going to use it
        if (lockAcquired) {
          pipelineCacheManager.clearSyncLock();
          lockAcquired = false;
        }
        clearTimeout(timeoutHandle); // Clear timeout on early return

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
        totalMentions: 0,
        failedEmails: 0
      }
    };
    
    // Push initial status update
    console.log('[PIPELINE:DEBUG] Pushing initial status update to userId:', userId);
    console.log('[PIPELINE:DEBUG] Initial update data:', JSON.stringify({
      type: 'status',
      status: 'fetching',
      progress: 10,
      message: 'Connecting to Gmail...',
      stats: pipelineStatus.stats
    }));

    await pushPipelineUpdate(userId, {
      type: 'status',
      status: 'fetching',
      progress: 10,
      message: 'Connecting to Gmail...',
      stats: pipelineStatus.stats
    });

    console.log('[PIPELINE:DEBUG] Initial status update pushed successfully');

    // Step 1: Fetch emails from Gmail
    let emails: any[] = [];
    let fetchDuration = 0;
    try {
      console.log('[Pipeline Sync] Creating GmailConnector with:', {
        useClerkOAuth,
        userId,
        hasRefreshToken: useClerkOAuth ? 'N/A' : !!gmailTokens?.refreshToken
      });
      
      const supabaseForEmails = createServiceRoleClient();
      let connector;

      let startDateOverride: Date | undefined;
      try {
        const { data: lastEmail } = await supabaseForEmails
          .from('emails')
          .select('received_at')
          .eq('user_id', userId)
          .order('received_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastEmail?.received_at) {
          const lastDate = new Date(lastEmail.received_at);
          startDateOverride = new Date(lastDate.getTime() - 60 * 60 * 1000);
          console.log('[Pipeline Sync] Using incremental Gmail fetch since', startDateOverride.toISOString());
        }
      } catch (incrementalError) {
        console.warn('[Pipeline Sync] Failed to compute incremental start date', incrementalError);
      }
      if (useClerkOAuth) {
        console.log('[Pipeline Sync] Initializing GmailConnector with Clerk OAuth for user:', userId);
        // Use Clerk OAuth - GmailConnector will fetch tokens from Clerk as needed
        // Pass undefined for refresh token and userId for Clerk OAuth
        connector = new GmailConnector(undefined, userId);
      } else {
        console.log('[Pipeline Sync] Initializing GmailConnector with legacy OAuth');
        // Legacy OAuth flow with refresh token
        connector = new GmailConnector(gmailTokens.refreshToken, userId);
      }
      const fetchStartTime = Date.now();

      // Add timeout to Gmail fetch to prevent hanging (40 seconds max)
      const fetchPromise = connector.fetchDailySubstacks(options.daysBack, userId, { startDate: startDateOverride });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gmail fetch timed out after 40 seconds')), 40000)
      );

      emails = await Promise.race([fetchPromise, timeoutPromise]) as any[];
      fetchDuration = Date.now() - fetchStartTime;

      console.log('[PIPELINE:DEBUG] Gmail fetch completed successfully');
      console.log('[PIPELINE:DEBUG] Fetch results:', {
        emailCount: emails.length,
        fetchDuration: `${fetchDuration}ms`,
        daysBack: options.daysBack
      });

      // Store fetched emails in the database if they don't already exist
      console.log('[PIPELINE:DEBUG] Storing fetched emails in database...');

      // Store emails one by one to ensure they have pending status
      let storedCount = 0;
      for (const email of emails) {
        try {
          // Normalize timestamps
          const receivedAt =
            email.receivedAt instanceof Date
              ? email.receivedAt.toISOString()
              : typeof email.receivedAt === 'string'
                ? email.receivedAt
                : new Date().toISOString();
          const processedAt =
            email.processedAt instanceof Date
              ? email.processedAt.toISOString()
              : typeof email.processedAt === 'string'
                ? email.processedAt
                : new Date().toISOString();

          // Build email data object matching the database schema
          const emailData = {
            user_id: userId,
            message_id: email.messageId || email.id || `${receivedAt}_${email.sender || 'unknown'}`,
            subject: email.subject || 'No Subject',
            sender: email.sender || 'Unknown',
            newsletter_name: email.newsletterName || email.sender || 'Unknown',
            raw_html: email.html || email.text || '',
            clean_text: email.text || '',
            received_at: receivedAt,
            processed_at: processedAt,
            processing_status: 'pending' as const,
            extraction_status: 'pending' as const,
            extraction_started_at: null,
            extraction_completed_at: null,
            extraction_error: null,
            companies_extracted: 0
          } satisfies Database['public']['Tables']['emails']['Insert'];

          // Try to insert the email (will fail if it already exists due to unique constraints)
          const { error: insertError } = await supabaseForEmails
            .from('emails')
            .insert(emailData);

          if (!insertError) {
            storedCount++;
          } else if (insertError.message && !insertError.message.includes('duplicate')) {
            // Log non-duplicate errors but continue
            console.warn(`Failed to store email: ${insertError.message}`);
          }
        } catch (err: any) {
          console.warn(`Error storing email: ${err?.message || err}`);
        }
      }

      console.log(`[PIPELINE:DEBUG] Stored ${storedCount} new emails in database`);

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
      console.log('[PIPELINE:DEBUG] Pushing emails_fetched update to userId:', userId);
      console.log('[PIPELINE:DEBUG] Update data:', JSON.stringify({
        type: 'emails_fetched',
        status: 'extracting',
        progress: 40,
        message: `Found ${emails.length} newsletters to analyze`,
        emailCount: emails.length
      }));

      await pushPipelineUpdate(userId, {
        type: 'emails_fetched',
        status: 'extracting',
        progress: 40,
        message: `Found ${emails.length} newsletters to analyze`,
        stats: pipelineStatus.stats,
        emailCount: emails.length
      });

      console.log('[PIPELINE:DEBUG] emails_fetched update pushed successfully');
      
      const messageOverride = emails.length > 0
        ? undefined
        : 'No new Substack emails fetched. Processing existing backlog...';

      return await triggerBackgroundProcessing(emails.length, {
        fallbackProcessedCount: emails.length,
        messageOverride,
        rateLimited: false
      });
    } catch (gmailError) {
      const errorMessage = gmailError instanceof Error ? gmailError.message : 'Gmail fetch failed';
      console.error('[Pipeline Sync] Gmail fetch error:', errorMessage);
      
      // Check for Gmail access errors
      if (errorMessage.includes('Gmail is not enabled') || errorMessage.includes('Mail service not enabled')) {
        await pushPipelineUpdate(userId, {
          type: 'error',
          status: 'error',
          message: 'This Google account does not have Gmail enabled. Please sign out and sign in with a different Google account that has Gmail access.',
        });

        // Release lock and clear timeout on early return
        if (lockAcquired) {
          pipelineCacheManager.clearSyncLock();
          lockAcquired = false;
        }
        clearTimeout(timeoutHandle);

        return NextResponse.json({
          success: false,
          error: 'Gmail not available on this Google account',
          details: {
            message: 'The Google account you signed in with does not have Gmail enabled. Please sign out and use a Google account with Gmail access.',
            accountEmail: user?.emailAddresses?.[0]?.emailAddress,
            suggestion: 'Use a personal Gmail account (ending in @gmail.com) or a Google Workspace account with Gmail enabled.'
          }
        }, { status: 403 });
      }

      const isRateLimitError = /rate limit/i.test(errorMessage);
      if (isRateLimitError) {
        console.warn('[Pipeline Sync] Gmail rate limit encountered, processing backlog only.');
        monitor.setHealthStatus('gmail', false, errorMessage);
        monitor.trackGmailApiCall(
          'fetchDailySubstacks',
          false,
          undefined,
          gmailError instanceof Error ? gmailError : new Error('Gmail fetch failed')
        );
        monitor.completeStep('gmail_fetch', {
          emailsCount: 0,
          duration: fetchDuration,
          rateLimited: true
        });

        pipelineStatus.progress = Math.max(pipelineStatus.progress, 40);
        pipelineStatus.status = 'extracting';
        pipelineStatus.message = 'Gmail rate limit hit. Processing existing backlog...';

        await pushPipelineUpdate(userId, {
          type: 'status',
          status: 'extracting',
          progress: pipelineStatus.progress,
          message: pipelineStatus.message,
          stats: pipelineStatus.stats
        });

        return await triggerBackgroundProcessing(0, {
          fallbackProcessedCount: 0,
          messageOverride: 'Gmail rate limit hit. Processing existing backlog.',
          statusOverride: 'extracting',
          rateLimited: true
        });
      }

      monitor.setHealthStatus('gmail', false, errorMessage);
      monitor.trackGmailApiCall('fetchDailySubstacks', false, undefined, gmailError instanceof Error ? gmailError : new Error('Gmail fetch failed'));
      throw gmailError;
    }

  } catch (error) {
    console.error('[Pipeline Sync] Pipeline failed with error:', error);
    console.error('[Pipeline Sync] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    let errorMessage = error instanceof Error ? error.message : 'Unknown pipeline error';
    const schemaError =
      error instanceof MissingUserIdColumnError || isMissingUserIdColumnError(error)
        ? (error instanceof MissingUserIdColumnError ? error : new MissingUserIdColumnError(undefined, error))
        : null;

    if (schemaError) {
      errorMessage =
        'Database schema is missing the required user_id column. Please run the latest migrations to enable secure pipeline sync.';
    }
    const monitoringResults = monitor.complete(false);

    // Push error update to client through SSE
    await pushPipelineUpdate(userId, {
      type: 'error',
      status: 'error',
      message: errorMessage,
      stats: pipelineStatus.stats
    });

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
    
    if (schemaError) {
      return buildMissingUserIdColumnResponse('pipeline_sync', schemaError.table);
    }

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
  } finally {
    // ALWAYS release the lock and clear the timeout, no matter what happens
    clearTimeout(timeoutHandle);

    if (lockAcquired) {
      console.log('[Pipeline Sync] Releasing lock in finally block');
      pipelineCacheManager.clearSyncLock();
      lockAcquired = false;
    }

    console.log('[Pipeline Sync] Cleanup complete - lock released, timeout cleared');
  }
}
