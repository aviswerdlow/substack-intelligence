import { NextRequest, NextResponse } from 'next/server';
import { pipelineCacheManager } from '@/lib/cache/pipeline-cache';
import { clearPipelineUpdates } from '@/lib/pipeline-updates';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const userId = session.user.id;
    
    console.log(`[Pipeline Unlock] Force unlocking pipeline for user: ${userId}`);
    
    // Clear the sync lock
    pipelineCacheManager.clearSyncLock();
    
    // Clear any pending pipeline updates
    clearPipelineUpdates(userId);
    
    // Also clear cache to ensure fresh state
    pipelineCacheManager.invalidateAll();
    
    console.log('[Pipeline Unlock] Successfully cleared pipeline lock and cache');
    
    return NextResponse.json({
      success: true,
      message: 'Pipeline lock cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Pipeline unlock error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlock pipeline'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }
    
    // Check if pipeline is locked
    const isLocked = pipelineCacheManager.getSyncLock();
    
    // Get cache stats for debugging
    const cacheStats = pipelineCacheManager.getStats();
    
    return NextResponse.json({
      success: true,
      locked: isLocked,
      cacheStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Pipeline lock check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check pipeline lock'
    }, { status: 500 });
  }
}