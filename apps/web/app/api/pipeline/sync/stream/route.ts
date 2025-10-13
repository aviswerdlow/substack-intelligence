import { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getPipelineUpdates, markUpdatesConsumed, clearPipelineUpdates } from '@/lib/pipeline-updates';

// Store active connections for pushing updates
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[SSE-STREAM:DEBUG] New SSE connection request received');

    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';

    console.log('[SSE-STREAM:DEBUG] Authentication check:', {
      hasUser: !!user,
      isDevelopment,
      userId: user?.id
    });

    if (!user && !isDevelopment) {
      console.log('[SSE-STREAM:DEBUG] Unauthorized access attempt - no user and not in development');
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = user?.id || 'dev';
    console.log('[SSE-STREAM:DEBUG] Establishing SSE stream for userId:', userId);

    const encoder = new TextEncoder();
    let interval: NodeJS.Timeout;

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[SSE-STREAM:DEBUG] Stream started for userId:', userId);

          // Send initial connection message
          const initialMessage = `data: ${JSON.stringify({
            type: 'connected',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(initialMessage));

          console.log('[SSE-STREAM:DEBUG] Initial connection message sent to client');

          // Set up interval to check for updates
          console.log('[SSE-STREAM:DEBUG] Setting up polling interval (1000ms) for userId:', userId);

          interval = setInterval(async () => {
            try {
              console.log(`[SSE-STREAM:DEBUG] Polling for updates - userId: ${userId}`);

              // Fetch updates from Supabase (or memory in dev)
              const updates = await getPipelineUpdates(userId);

              if (updates && updates.length > 0) {
                console.log(`[SSE-STREAM:DEBUG] Found ${updates.length} updates for user ${userId}`);

                const consumedIds: string[] = [];

                // Send all updates
                for (const update of updates) {
                  console.log('[SSE-STREAM:DEBUG] Sending update to client:', {
                    type: update.type,
                    status: update.status,
                    progress: update.progress,
                    message: update.message?.substring(0, 100),
                    timestamp: update.timestamp
                  });

                  // Send update (remove _dbId from the data sent to client)
                  const { _dbId, ...updateData } = update;
                  const message = `data: ${JSON.stringify(updateData)}\n\n`;
                  controller.enqueue(encoder.encode(message));

                  // Track DB ID for marking as consumed
                  if (_dbId) {
                    consumedIds.push(_dbId);
                  }

                  console.log('[SSE-STREAM:DEBUG] Update sent successfully');

                  // Check if this is a terminal update
                  if (update.type === 'complete' || update.type === 'error') {
                    console.log('[SSE-STREAM:DEBUG] Terminal update detected, closing stream in 100ms');

                    // Mark updates as consumed
                    if (consumedIds.length > 0) {
                      await markUpdatesConsumed(consumedIds);
                    }

                    // Clear all remaining updates
                    await clearPipelineUpdates(userId);

                    clearInterval(interval);

                    // Send final message before closing
                    setTimeout(() => {
                      controller.close();
                      console.log('[SSE-STREAM:DEBUG] Stream closed after terminal update');
                    }, 100);
                    return;
                  }
                }

                // Mark all sent updates as consumed
                if (consumedIds.length > 0) {
                  await markUpdatesConsumed(consumedIds);
                }
              } else {
                // Send heartbeat to keep connection alive
                const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`;
                controller.enqueue(encoder.encode(heartbeat));
                console.log('[SSE-STREAM:DEBUG] No updates available, sent heartbeat');
              }
            } catch (e) {
              console.error('[SSE-STREAM:ERROR] Error in SSE interval:', e);
              clearInterval(interval);
              controller.close();
              console.log('[SSE-STREAM:DEBUG] Stream closed due to error');
            }
          }, 1000); // Check every 1 second for faster updates
        } catch (e) {
          console.error('[SSE-STREAM:ERROR] Error starting SSE stream:', e);
          controller.close();
          console.log('[SSE-STREAM:DEBUG] Stream closed due to startup error');
        }
      },
      cancel() {
        console.log('[SSE-STREAM:DEBUG] Stream cancel requested for userId:', userId);
        if (interval) {
          clearInterval(interval);
          console.log('[SSE-STREAM:DEBUG] Polling interval cleared');
        }
      }
    });

    // Return SSE response
    console.log('[SSE-STREAM:DEBUG] Returning SSE response with headers');

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[SSE-STREAM:ERROR] Top-level SSE stream error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

