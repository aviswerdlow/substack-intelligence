import { NextRequest, NextResponse } from 'next/server';
import {
  createServerComponentClient,
  getTodoById,
  toggleTodoCompletion
} from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validation schemas
const TodoIdSchema = z.string().uuid('Invalid todo ID format');

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos');
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

    // Validate todo ID
    const todoId = TodoIdSchema.parse(params.id);

    // Toggle todo completion in database
    const supabase = createServerComponentClient();
    
    // First check if todo exists and belongs to user
    const existingTodo = await getTodoById(supabase, session.user.id, todoId);
    if (!existingTodo) {
      return NextResponse.json({
        success: false,
        error: 'Todo not found'
      }, { status: 404 });
    }

    const updatedTodo = await toggleTodoCompletion(supabase, session.user.id, todoId);

    return NextResponse.json({
      success: true,
      data: {
        todo: updatedTodo,
        action: updatedTodo.completed ? 'completed' : 'uncompleted'
      }
    });

  } catch (error) {
    console.error('Error toggling todo completion:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid todo ID',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to toggle todo completion'
    }, { status: 500 });
  }
}