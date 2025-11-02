import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient, getTodoStats } from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos/stats');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check authentication
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get todo statistics from database
    const supabase = createServerComponentClient();
    const stats = await getTodoStats(supabase, session.user.id);

    // If no stats available, return zeros
    if (!stats) {
      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalTodos: 0,
            completedTodos: 0,
            activeTodos: 0,
            overdueeTodos: 0,
            dueToday: 0,
            dueThisWeek: 0,
            completionRate: 0,
          }
        }
      });
    }

    // Calculate additional statistics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          // Core stats from database function
          totalTodos: parseInt((stats as any).total_todos),
          completedTodos: parseInt((stats as any).completed_todos),
          activeTodos: parseInt((stats as any).active_todos),
          overdueeTodos: parseInt((stats as any).overdue_todos),
          dueToday: parseInt((stats as any).due_today),
          dueThisWeek: parseInt((stats as any).due_this_week),
          completionRate: parseFloat((stats as any).completion_rate),
          
          // Calculated stats
          productivity: {
            completionRate: parseFloat((stats as any).completion_rate),
            overdueRate: (stats as any).active_todos > 0 ? 
              Math.round(((stats as any).overdue_todos / (stats as any).active_todos) * 100 * 100) / 100 : 0,
            onTimeRate: (stats as any).active_todos > 0 ? 
              Math.round((((stats as any).active_todos - (stats as any).overdue_todos) / (stats as any).active_todos) * 100 * 100) / 100 : 100,
          },
          
          summary: {
            todayFocus: parseInt((stats as any).due_today),
            weekAhead: parseInt((stats as any).due_this_week),
            needsAttention: parseInt((stats as any).overdue_todos),
            inProgress: parseInt((stats as any).active_todos)
          }
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          userId: session.user.id,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching todo stats:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch todo statistics'
    }, { status: 500 });
  }
}