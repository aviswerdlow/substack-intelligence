import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { EmbeddingService } from '@substack-intelligence/ai';
import { z } from 'zod';

const SimilarCompaniesSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 5),
  threshold: z.string().optional().transform(val => val ? parseFloat(val) : 0.7),
  exclude: z.string().optional().transform(val => val ? val.split(',') : [])
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const companyId = params.id;

    // Validate UUID format
    if (!companyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid company ID format'
      }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params_parsed = SimilarCompaniesSchema.parse({
      limit: searchParams.get('limit'),
      threshold: searchParams.get('threshold'),
      exclude: searchParams.get('exclude')
    });

    // Initialize embedding service
    const embeddingService = new EmbeddingService();

    // Find similar companies
    const similarCompanies = await embeddingService.findSimilarCompanies(companyId, {
      limit: params_parsed.limit,
      threshold: params_parsed.threshold,
      excludeIds: params_parsed.exclude
    });

    return NextResponse.json({
      success: true,
      data: {
        companyId,
        similarCompanies,
        totalFound: similarCompanies.length,
        threshold: params_parsed.threshold
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Failed to find similar companies:', error);

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