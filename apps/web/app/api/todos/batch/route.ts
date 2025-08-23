import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { 
  createServerComponentClient, 
  updateTodo, 
  deleteTodo,
  getTodoById
} from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validation schemas
const BatchOperationSchema = z.object({
  operation: z.enum(['complete', 'uncomplete', 'delete', 'update']),
  todoIds: z.array(z.string().uuid('Invalid todo ID format')).min(1, 'At least one todo ID is required').max(100, 'Too many todos for batch operation'),
  updateData: z.object({
    completed: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    category: z.string().max(100, 'Category too long').optional().nullable(),
    tags: z.array(z.string().max(50, 'Tag too long')).max(20, 'Too many tags').optional(),
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos/batch');
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

    // Parse and validate request body
    const body = await request.json();
    const { operation, todoIds, updateData } = BatchOperationSchema.parse(body);

    // Validate that updateData is provided for update operations
    if (operation === 'update' && !updateData) {
      return NextResponse.json({
        success: false,
        error: 'Update data is required for update operations'
      }, { status: 400 });
    }

    const supabase = createServerComponentClient();
    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // Process each todo
    for (const todoId of todoIds) {
      try {
        // First verify the todo exists and belongs to the user
        const existingTodo = await getTodoById(supabase, userId, todoId);
        if (!existingTodo) {
          results.failed.push({ id: todoId, error: 'Todo not found' });
          continue;
        }

        switch (operation) {
          case 'complete':
            await updateTodo(supabase, userId, todoId, { completed: true });
            break;
            
          case 'uncomplete':
            await updateTodo(supabase, userId, todoId, { completed: false });
            break;
            
          case 'delete':
            await deleteTodo(supabase, userId, todoId);
            break;
            
          case 'update':
            if (updateData) {
              await updateTodo(supabase, userId, todoId, updateData);
            }
            break;
        }

        results.successful.push(todoId);

      } catch (error) {
        console.error(`Error processing todo ${todoId}:`, error);
        results.failed.push({ 
          id: todoId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Determine response status based on results
    const hasFailures = results.failed.length > 0;
    const hasSuccesses = results.successful.length > 0;
    
    let status = 200;
    let message = '';

    if (hasSuccesses && !hasFailures) {
      message = `All ${results.successful.length} todos processed successfully`;
    } else if (hasSuccesses && hasFailures) {
      status = 207; // Multi-Status
      message = `${results.successful.length} todos processed successfully, ${results.failed.length} failed`;
    } else {
      status = 400;
      message = 'All operations failed';
    }

    return NextResponse.json({
      success: hasSuccesses,
      data: {
        message,
        operation,
        results: {
          successful: results.successful,
          failed: results.failed,
          totalProcessed: todoIds.length,
          successCount: results.successful.length,
          failureCount: results.failed.length
        }
      }
    }, { status });

  } catch (error) {
    console.error('Error in batch operation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid batch operation data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to perform batch operation'
    }, { status: 500 });
  }
}