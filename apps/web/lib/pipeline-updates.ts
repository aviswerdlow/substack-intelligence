// Global store for pipeline updates (in production, use Redis)
// Store array of updates per user to queue multiple updates
export const pipelineUpdates = new Map<string, any[]>();

// Helper function to push updates (called from sync route)
export function pushPipelineUpdate(userId: string, update: any) {
  console.log('[PIPELINE-UPDATES:DEBUG] pushPipelineUpdate called', {
    userId,
    updateType: update.type,
    status: update.status,
    progress: update.progress,
    message: update.message?.substring(0, 100)
  });

  // Get existing queue or create new one
  const updateQueue = pipelineUpdates.get(userId) || [];

  console.log('[PIPELINE-UPDATES:DEBUG] Current queue size before push:', updateQueue.length);

  // Add new update to queue
  updateQueue.push({
    ...update,
    timestamp: new Date().toISOString()
  });

  // Store updated queue
  pipelineUpdates.set(userId, updateQueue);

  console.log('[PIPELINE-UPDATES:DEBUG] Update stored in queue. New queue size:', updateQueue.length);
  console.log('[PIPELINE-UPDATES:DEBUG] Total users in store:', pipelineUpdates.size);
}

// Helper function to clear updates for a user
export function clearPipelineUpdates(userId: string) {
  pipelineUpdates.delete(userId);
}