import { NextRequest, NextResponse } from 'next/server';
import { axiomLogger } from '@/lib/monitoring/axiom';
import { ServerErrorHandler } from '@/lib/monitoring/server-error-handler';
import { z } from 'zod';

const InteractionSchema = z.object({
  action: z.string(),
  data: z.record(z.any()).optional(),
  userId: z.string().optional(),
  url: z.string(),
  timestamp: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const interactionData = InteractionSchema.parse(body);

    // Extract URL info
    const url = new URL(interactionData.url);

    // Log interaction to Axiom
    await axiomLogger.logBusinessMetric('user_interaction', 1, {
      action: interactionData.action,
      userId: interactionData.userId,
      path: url.pathname,
      data: interactionData.data,
      userAgent: request.headers.get('user-agent'),
      timestamp: interactionData.timestamp
    });

    return NextResponse.json({
      success: true,
      message: 'Interaction tracked successfully'
    });

  } catch (error) {
    console.error('Failed to track interaction:', error);
    
    return ServerErrorHandler.handleError(error as Error, {
      apiRoute: '/api/monitoring/interaction',
      method: 'POST'
    });
  }
}