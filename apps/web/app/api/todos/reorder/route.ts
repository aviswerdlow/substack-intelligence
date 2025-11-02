import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient, reorderTodos } from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validation schemas
const ReorderTodosSchema = z.object({
  todoUpdates: z.array(
    z.object({
      id: z.string().uuid('Invalid todo ID format'),
      position: z.number().int().min(0, 'Position must be non-negative')
    })
  ).min(1, 'At least one todo update is required').max(100, 'Too many todos to reorder at once')
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos/reorder');
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

    // Parse and validate request body
    const body = await request.json();
    const { todoUpdates } = ReorderTodosSchema.parse(body);

    // Validate that all positions are unique
    const positions = todoUpdates.map(update => update.position);
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
      return NextResponse.json({
        success: false,
        error: 'All positions must be unique'
      }, { status: 400 });
    }

    // Reorder todos in database
    const supabase = createServerComponentClient();
    await reorderTodos(supabase, session.user.id, todoUpdates as { id: string; position: number }[]);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Todos reordered successfully',
        updatedCount: todoUpdates.length
      }
    });

  } catch (error) {
    console.error('Error reordering todos:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid reorder data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to reorder todos'
    }, { status: 500 });
  }
}