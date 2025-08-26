import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerComponentClient, getTodos, createTodo, TodoFilters } from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validation schemas
const GetTodosSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  orderBy: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'position']).optional().default('position'),
  orderDirection: z.enum(['asc', 'desc']).optional().default('asc'),
  completed: z.string().optional().transform(val => val ? val === 'true' : undefined),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.string().optional(),
  tags: z.string().optional().transform(val => val ? val.split(',').map(t => t.trim()) : undefined),
  search: z.string().optional(),
  dueDateStart: z.string().optional(),
  dueDateEnd: z.string().optional(),
  overdue: z.string().optional().transform(val => val ? val === 'true' : undefined),
});

const CreateTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  due_date: z.string().optional().nullable().transform(val => {
    if (!val) return undefined;
    // Validate ISO date string
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid due date format');
    }
    return val;
  }),
  category: z.string().max(100, 'Category too long').optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(20, 'Too many tags').optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos');
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = GetTodosSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      orderBy: searchParams.get('orderBy'),
      orderDirection: searchParams.get('orderDirection'),
      completed: searchParams.get('completed'),
      priority: searchParams.get('priority'),
      category: searchParams.get('category'),
      tags: searchParams.get('tags'),
      search: searchParams.get('search'),
      dueDateStart: searchParams.get('dueDateStart'),
      dueDateEnd: searchParams.get('dueDateEnd'),
      overdue: searchParams.get('overdue'),
    });

    // Build filters object
    const filters: TodoFilters = {};
    if (params.completed !== undefined) filters.completed = params.completed;
    if (params.priority) filters.priority = params.priority;
    if (params.category) filters.category = params.category;
    if (params.tags) filters.tags = params.tags;
    if (params.search) filters.search = params.search;
    if (params.dueDateStart) filters.dueDateStart = params.dueDateStart;
    if (params.dueDateEnd) filters.dueDateEnd = params.dueDateEnd;
    if (params.overdue) filters.overdue = params.overdue;

    // Get todos from database
    const supabase = createServerComponentClient();
    const result = await getTodos(supabase, userId, {
      limit: params.limit,
      offset: params.offset,
      orderBy: params.orderBy,
      orderDirection: params.orderDirection,
      filters
    });

    return NextResponse.json({
      success: true,
      data: {
        todos: result.todos,
        pagination: {
          total: result.total,
          limit: params.limit,
          offset: params.offset,
          hasMore: result.hasMore
        }
      }
    });

  } catch (error) {
    console.error('Error fetching todos:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch todos'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = await withRateLimit(request, 'api/todos');
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
    const todoData = CreateTodoSchema.parse(body);

    // Create todo in database
    const supabase = createServerComponentClient();
    const newTodo = await createTodo(supabase, userId, todoData);

    return NextResponse.json({
      success: true,
      data: {
        todo: newTodo
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating todo:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid todo data',
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
      error: 'Failed to create todo'
    }, { status: 500 });
  }
}