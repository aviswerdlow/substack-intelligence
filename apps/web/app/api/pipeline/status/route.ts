import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { pipelineCacheManager, performanceUtils, requestDeduplicator } from '@/lib/cache/pipeline-cache';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// Disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PipelineMetrics {
  totalEmails: number;
  totalCompanies: number;
  totalMentions: number;
  recentEmails: number;
  recentCompanies: number;
  lastSyncTime: string | null;
  dataAge: number; // in minutes
  isFresh: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const session = await getServerSecuritySession();

    if (!session && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const userId = session?.user.id || 'development-user';

    // Check cache first
    const cacheKey = `metrics:${userId}`;
    const cachedResponse = pipelineCacheManager.getPipelineMetrics();

    if (cachedResponse) {
      console.log('[CACHE] Pipeline metrics served from cache');

      return NextResponse.json(
        performanceUtils.addCacheStatus(cachedResponse, true, cacheKey),
        {
          headers: performanceUtils.createCacheHeaders(30)
        }
      );
    }

    // Use request deduplication to prevent multiple simultaneous requests
    return await requestDeduplicator.dedupe(cacheKey, async () => {
      const { result: responseData, duration } = await performanceUtils.measureTime(async () => {
        const supabase = createServiceRoleClient();
    
        // Get the most recent email to determine last sync time - FILTER BY USER_ID
        const { data: latestEmail } = await supabase
          .from('emails')
          .select('received_at')
          .eq('user_id', userId)  // CRITICAL: Filter by user_id
          .order('received_at', { ascending: false })
          .limit(1)
          .single();
        
        const lastSyncTime = latestEmail?.received_at || null;
        const dataAge = lastSyncTime 
          ? Math.floor((Date.now() - new Date(lastSyncTime).getTime()) / (1000 * 60))
          : Infinity;
        
        // Data is considered fresh if less than 30 minutes old
        const isFresh = dataAge < 30;
        
        // Get counts for the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Parallel queries for better performance - ALL FILTER BY USER_ID
        const [
          emailsResult,
          companiesResult,
          mentionsResult,
          recentEmailsResult,
          recentCompaniesResult
        ] = await Promise.all([
          supabase.from('emails')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),  // CRITICAL: Filter by user_id
          supabase.from('companies')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),  // CRITICAL: Filter by user_id
          supabase.from('company_mentions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),  // CRITICAL: Filter by user_id
          supabase
            .from('emails')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)  // CRITICAL: Filter by user_id
            .gte('received_at', twentyFourHoursAgo),
          supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)  // CRITICAL: Filter by user_id
            .gte('first_seen_at', twentyFourHoursAgo)
        ]);
        
        const metrics: PipelineMetrics = {
          totalEmails: emailsResult.count || 0,
          totalCompanies: companiesResult.count || 0,
          totalMentions: mentionsResult.count || 0,
          recentEmails: recentEmailsResult.count || 0,
          recentCompanies: recentCompaniesResult.count || 0,
          lastSyncTime,
          dataAge,
          isFresh
        };
        
        // Get trending companies (most mentioned in last 24 hours) - FILTER BY USER_ID
        const { data: trendingCompanies } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            description,
            mention_count,
            company_mentions!inner(
              extracted_at
            )
          `)
          .eq('user_id', userId)  // CRITICAL: Filter by user_id
          .gte('company_mentions.extracted_at', twentyFourHoursAgo)
          .order('mention_count', { ascending: false })
          .limit(5);
        
        const responseData = {
          success: true,
          metrics,
          trending: trendingCompanies || [],
          _performanceMetrics: {
            queryDuration: 0 // Will be set below
          }
        };
        
        // Cache the successful response
        pipelineCacheManager.setPipelineMetrics(responseData, 5 * 60 * 1000); // Cache for 5 minutes
        
        return responseData;
      });
      
      // Add performance metrics
      responseData._performanceMetrics.queryDuration = duration;
      
      return NextResponse.json(
        performanceUtils.addCacheStatus(responseData, false, cacheKey),
        { 
          headers: performanceUtils.createCacheHeaders(30)
        }
      );
    });
    
  } catch (error) {
    console.error('Pipeline status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pipeline status',
      metrics: {
        totalEmails: 0,
        totalCompanies: 0,
        totalMentions: 0,
        recentEmails: 0,
        recentCompanies: 0,
        lastSyncTime: null,
        dataAge: Infinity,
        isFresh: false
      },
      trending: []
    }, { status: 500 });
  }
}