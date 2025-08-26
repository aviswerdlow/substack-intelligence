import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  createServerComponentClient, 
  getTodoById, 
  updateTodo, 
  deleteTodo 
} from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validation schemas
const TodoIdSchema = z.string().uuid('Invalid todo ID format');

const UpdateTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().optional().nullable().transform(val => {
    if (!val) return undefined;
    // Validate ISO date string
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid due date format');
    }
    return val;
  }),
  category: z.string().max(100, 'Category too long').optional().nullable(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(20, 'Too many tags').optional(),
  position: z.number().int().min(0).optional(),
}).refine(
  data => Object.keys(data).length > 0, 
  { message: 'At least one field must be provided for update' }
);

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Validate todo ID
    const todoId = TodoIdSchema.parse(params.id);

    // Get todo from database
    const supabase = createServerComponentClient();
    const todo = await getTodoById(supabase, userId, todoId);

    if (!todo) {
      return NextResponse.json({
        success: false,
        error: 'Todo not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        todo
      }
    });

  } catch (error) {
    console.error('Error fetching todo:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid todo ID',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch todo'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Validate todo ID
    const todoId = TodoIdSchema.parse(params.id);

    // Parse and validate request body
    const body = await request.json();
    const updateData = UpdateTodoSchema.parse(body);

    // Update todo in database
    const supabase = createServerComponentClient();
    
    // First check if todo exists and belongs to user
    const existingTodo = await getTodoById(supabase, userId, todoId);
    if (!existingTodo) {
      return NextResponse.json({
        success: false,
        error: 'Todo not found'
      }, { status: 404 });
    }

    const updatedTodo = await updateTodo(supabase, userId, todoId, updateData);

    return NextResponse.json({
      success: true,
      data: {
        todo: updatedTodo
      }
    });

  } catch (error) {
    console.error('Error updating todo:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid update data',
        details: error.errors
      }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('Invalid due date')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid due date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update todo'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Validate todo ID
    const todoId = TodoIdSchema.parse(params.id);

    // Delete todo from database
    const supabase = createServerComponentClient();
    
    // First check if todo exists and belongs to user
    const existingTodo = await getTodoById(supabase, userId, todoId);
    if (!existingTodo) {
      return NextResponse.json({
        success: false,
        error: 'Todo not found'
      }, { status: 404 });
    }

    await deleteTodo(supabase, userId, todoId);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Todo deleted successfully'
      }
    });

  } catch (error) {
    console.error('Error deleting todo:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid todo ID',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to delete todo'
    }, { status: 500 });
  }
}