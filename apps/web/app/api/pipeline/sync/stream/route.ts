import { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { pipelineUpdates } from '@/lib/pipeline-updates';

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

          interval = setInterval(() => {
            try {
              console.log(`[SSE-STREAM:DEBUG] Polling for updates - userId: ${userId}, Map size: ${pipelineUpdates.size}`);

              const updateQueue = pipelineUpdates.get(userId);

              if (updateQueue && updateQueue.length > 0) {
                console.log(`[SSE-STREAM:DEBUG] Found ${updateQueue.length} updates in queue for user ${userId}`);

                // Send all queued updates
                while (updateQueue.length > 0) {
                  const update = updateQueue.shift();
                  if (update) {
                    console.log('[SSE-STREAM:DEBUG] Sending update to client:', {
                      type: update.type,
                      status: update.status,
                      progress: update.progress,
                      message: update.message?.substring(0, 100),
                      timestamp: update.timestamp
                    });

                    const message = `data: ${JSON.stringify(update)}\n\n`;
                    controller.enqueue(encoder.encode(message));

                    console.log('[SSE-STREAM:DEBUG] Update sent successfully, remaining in queue:', updateQueue.length);

                    // Check if this is a terminal update
                    if (update.type === 'complete' || update.type === 'error') {
                      console.log('[SSE-STREAM:DEBUG] Terminal update detected, closing stream in 100ms');
                      pipelineUpdates.delete(userId);
                      clearInterval(interval);
                      // Send final message before closing
                      setTimeout(() => {
                        controller.close();
                        console.log('[SSE-STREAM:DEBUG] Stream closed after terminal update');
                      }, 100);
                      return;
                    }
                  }
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

