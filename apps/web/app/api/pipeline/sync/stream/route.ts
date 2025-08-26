import { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { pipelineUpdates } from '@/lib/pipeline-updates';

// Store active connections for pushing updates
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = user?.id || 'dev';
    const encoder = new TextEncoder();
    let interval: NodeJS.Timeout;

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          const initialMessage = `data: ${JSON.stringify({
            type: 'connected',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(initialMessage));

          // Set up interval to check for updates
          interval = setInterval(() => {
            try {
              console.log(`Checking for updates for user: ${userId}, Map size: ${pipelineUpdates.size}`);
              const updateQueue = pipelineUpdates.get(userId);
              
              if (updateQueue && updateQueue.length > 0) {
                console.log(`Found ${updateQueue.length} updates for user ${userId}`);
                // Send all queued updates
                while (updateQueue.length > 0) {
                  const update = updateQueue.shift();
                  if (update) {
                    const message = `data: ${JSON.stringify(update)}\n\n`;
                    controller.enqueue(encoder.encode(message));
                    console.log('Sending update to client:', update.type, update.message);
                    
                    // Check if this is a terminal update
                    if (update.type === 'complete' || update.type === 'error') {
                      pipelineUpdates.delete(userId);
                      clearInterval(interval);
                      // Send final message before closing
                      setTimeout(() => {
                        controller.close();
                      }, 100);
                      return;
                    }
                  }
                }
              } else {
                // Send heartbeat to keep connection alive
                const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`;
                controller.enqueue(encoder.encode(heartbeat));
              }
            } catch (e) {
              console.error('Error in SSE interval:', e);
              clearInterval(interval);
              controller.close();
            }
          }, 1000); // Check every 1 second for faster updates
        } catch (e) {
          console.error('Error starting SSE stream:', e);
          controller.close();
        }
      },
      cancel() {
        if (interval) {
          clearInterval(interval);
        }
      }
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('SSE stream error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

