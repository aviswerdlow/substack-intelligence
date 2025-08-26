import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerComponentClient, getCompanies } from '@substack-intelligence/database';
import { z } from 'zod';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GetCompaniesSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  search: z.string().optional(),
  fundingStatus: z.string().optional(),
  orderBy: z.enum(['mention_count', 'created_at', 'name']).optional().default('mention_count'),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc')
});

export async function GET(request: NextRequest) {
  try {
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
    const params = GetCompaniesSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      search: searchParams.get('search'),
      fundingStatus: searchParams.get('fundingStatus'),
      orderBy: searchParams.get('orderBy'),
      orderDirection: searchParams.get('orderDirection')
    });

    // Get companies from database
    const supabase = createServerComponentClient();
    const result = await getCompanies(supabase, params);

    return NextResponse.json({
      success: true,
      data: {
        companies: result.companies,
        pagination: {
          total: result.total,
          limit: params.limit,
          offset: params.offset,
          hasMore: result.hasMore
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Failed to fetch companies:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}