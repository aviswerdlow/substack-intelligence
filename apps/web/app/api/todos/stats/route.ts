import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createServerComponentClient, getTodoStats } from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';

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
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get todo statistics from database
    const supabase = createServerComponentClient();
    const stats = await getTodoStats(supabase, userId);

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
          totalTodos: parseInt(stats.total_todos),
          completedTodos: parseInt(stats.completed_todos),
          activeTodos: parseInt(stats.active_todos),
          overdueeTodos: parseInt(stats.overdue_todos),
          dueToday: parseInt(stats.due_today),
          dueThisWeek: parseInt(stats.due_this_week),
          completionRate: parseFloat(stats.completion_rate),
          
          // Calculated stats
          productivity: {
            completionRate: parseFloat(stats.completion_rate),
            overdueRate: stats.active_todos > 0 ? 
              Math.round((stats.overdue_todos / stats.active_todos) * 100 * 100) / 100 : 0,
            onTimeRate: stats.active_todos > 0 ? 
              Math.round(((stats.active_todos - stats.overdue_todos) / stats.active_todos) * 100 * 100) / 100 : 100,
          },
          
          summary: {
            todayFocus: parseInt(stats.due_today),
            weekAhead: parseInt(stats.due_this_week),
            needsAttention: parseInt(stats.overdue_todos),
            inProgress: parseInt(stats.active_todos)
          }
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          userId: userId,
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