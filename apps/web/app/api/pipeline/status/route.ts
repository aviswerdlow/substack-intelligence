import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { pipelineCacheManager, performanceUtils, requestDeduplicator } from '@/lib/cache/pipeline-cache';

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
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Check cache first
    const cacheKey = `metrics:${user?.id || 'dev'}`;
    const cachedMetrics = pipelineCacheManager.getPipelineMetrics();
    
    if (cachedMetrics) {
      console.log('[CACHE] Pipeline metrics served from cache');
      
      return NextResponse.json(
        performanceUtils.addCacheStatus(cachedMetrics, true, cacheKey),
        { 
          headers: performanceUtils.createCacheHeaders(30)
        }
      );
    }

    // Use request deduplication to prevent multiple simultaneous requests
    return await requestDeduplicator.dedupe(cacheKey, async () => {
      const { result: responseData, duration } = await performanceUtils.measureTime(async () => {
        const supabase = createServiceRoleClient();
    
        // Get the most recent email to determine last sync time
        const { data: latestEmail } = await supabase
          .from('emails')
          .select('received_at')
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
        
        // Parallel queries for better performance
        const [
          emailsResult,
          companiesResult,
          mentionsResult,
          recentEmailsResult,
          recentCompaniesResult
        ] = await Promise.all([
          supabase.from('emails').select('*', { count: 'exact', head: true }),
          supabase.from('companies').select('*', { count: 'exact', head: true }),
          supabase.from('company_mentions').select('*', { count: 'exact', head: true }),
          supabase
            .from('emails')
            .select('*', { count: 'exact', head: true })
            .gte('received_at', twentyFourHoursAgo),
          supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
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
        
        // Get trending companies (most mentioned in last 24 hours)
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
          .gte('company_mentions.extracted_at', twentyFourHoursAgo)
          .order('mention_count', { ascending: false })
          .limit(5);
        
        // Calculate suggested next sync time
        let suggestedNextSync: Date;
        if (dataAge < 15) {
          // If very fresh, wait at least 15 minutes
          suggestedNextSync = new Date(Date.now() + (15 - dataAge) * 60 * 1000);
        } else if (dataAge < 60) {
          // If somewhat fresh, sync soon
          suggestedNextSync = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        } else {
          // If stale, sync immediately
          suggestedNextSync = new Date();
        }
        
        return {
          success: true,
          data: {
            metrics,
            trending: trendingCompanies || [],
            health: {
              status: isFresh ? 'healthy' : dataAge < 60 ? 'warning' : 'stale',
              message: isFresh 
                ? 'Data is fresh and up-to-date' 
                : dataAge < 60 
                  ? 'Data is getting stale, consider refreshing'
                  : 'Data is stale, refresh recommended',
              suggestedNextSync: suggestedNextSync.toISOString(),
              autoSyncEnabled: true, // This could be pulled from user settings
              syncInterval: 30 // minutes
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
      });

      // Cache the results
      pipelineCacheManager.setPipelineMetrics(responseData);
      
      console.log(`[PERFORMANCE] Pipeline metrics fetched in ${duration}ms`);
      
      return NextResponse.json(
        performanceUtils.addCacheStatus(responseData, false, cacheKey),
        { 
          headers: performanceUtils.createCacheHeaders(30)
        }
      );
    });
    
  } catch (error) {
    console.error('Failed to get pipeline status:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}