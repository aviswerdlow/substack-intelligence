import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService } from '@substack-intelligence/ai';
import { z } from 'zod';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

const SemanticSearchSchema = z.object({
  q: z.string().min(1).max(500), // query
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  threshold: z.string().optional().transform(val => val ? parseFloat(val) : 0.6),
  industries: z.string().optional().transform(val => val ? val.split(',') : [])
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = SemanticSearchSchema.parse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
      threshold: searchParams.get('threshold'),
      industries: searchParams.get('industries')
    });

    // Initialize embedding service
    const embeddingService = new EmbeddingService();

    // Perform semantic search
    const results = await embeddingService.semanticSearch(params.q, {
      limit: params.limit,
      threshold: params.threshold,
      industries: params.industries
    });

    return NextResponse.json({
      success: true,
      data: {
        query: params.q,
        results,
        totalFound: results.length,
        parameters: {
          limit: params.limit,
          threshold: params.threshold,
          industries: params.industries
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Semantic search failed:', error);

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